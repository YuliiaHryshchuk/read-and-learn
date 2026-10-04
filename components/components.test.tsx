// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import Fragment from "./Fragment";
import TextContainer from "./TextContainer";
import GenerationControls from "@/app/new-text/_components/GenerationControls";
import LanguageSelector from "@/app/new-text/_components/LanguageSelector";

vi.mock("next/image", () => ({
  default: ({ src }: { src: string }) => <span data-image-src={src} />,
}));

afterEach(cleanup);

describe("TextContainer", () => {
  it("renders optional metadata and hides content on request", () => {
    const { rerender } = render(
      <TextContainer
        title="Title"
        description="Description"
        icon={<span>Icon</span>}
        actions={[<button key="action">Action</button>]}
      >
        Content
      </TextContainer>,
    );
    expect(screen.getByText("Title")).toBeTruthy();
    expect(screen.getByText("Description")).toBeTruthy();
    expect(screen.getByText("Content")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Action" })).toBeTruthy();

    rerender(<TextContainer title="Title" showContent={false}>Content</TextContainer>);
    expect(screen.queryByText("Content")).toBeNull();
  });
});

describe("Fragment", () => {
  it("toggles translation, explanation, and the whole fragment", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <Fragment
        number={1}
        text="Hola mundo."
        translation="Hello world."
        explanation={<span>hola — hello</span>}
        isOpen
        onOpenChange={onOpenChange}
      />,
    );

    expect(screen.queryByText("Hello world.")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Show translation" }));
    expect(screen.getByText("Hello world.")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Collapse explanation" }));
    expect(screen.queryByText("hola — hello")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Collapse fragment 1" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("expands a collapsed fragment from its preview", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <Fragment
        number={2}
        text="Adiós."
        translation="Goodbye."
        explanation={null}
        isOpen={false}
        onOpenChange={onOpenChange}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Expand fragment 2: Adiós." }));
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });
});

describe("GenerationControls", () => {
  it("calls normal generation and shows loading labels", async () => {
    const user = userEvent.setup();
    const onGenerate = vi.fn();
    const { rerender } = render(
      <GenerationControls
        hasResult={false}
        disabled={false}
        isLoadingSavedMaterial={false}
        isPending={false}
        onGenerate={onGenerate}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Generate explanation" }));
    expect(onGenerate).toHaveBeenCalledWith();

    rerender(
      <GenerationControls
        hasResult={false}
        disabled
        isLoadingSavedMaterial
        isPending={false}
        onGenerate={onGenerate}
      />,
    );
    expect(screen.getByRole("button", { name: "Loading saved text…" }))
      .toHaveProperty("disabled", true);
  });

  it("supports update and explicit full regeneration", async () => {
    const user = userEvent.setup();
    const onGenerate = vi.fn();
    render(
      <GenerationControls
        hasResult
        disabled={false}
        isLoadingSavedMaterial={false}
        isPending={false}
        onGenerate={onGenerate}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Update explanation" }));
    await user.click(screen.getByRole("button", { name: "Generate again" }));
    expect(onGenerate).toHaveBeenNthCalledWith(1);
    expect(onGenerate).toHaveBeenNthCalledWith(2, true);
  });
});

describe("LanguageSelector", () => {
  it("selects a supported language and flags custom values", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <LanguageSelector value="English" disabled={false} onChange={onChange} />,
    );
    await user.click(screen.getByRole("button", { name: "Spanish" }));
    expect(onChange).toHaveBeenCalledWith("Spanish");

    rerender(
      <LanguageSelector value="Klingon" disabled={false} onChange={onChange} />,
    );
    expect(screen.getByLabelText("Custom language warning")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Explanation language"), {
      target: { value: "French" },
    });
    expect(onChange).toHaveBeenLastCalledWith("French");
  });

  it("prevents opening while disabled", () => {
    render(<LanguageSelector value="English" disabled onChange={vi.fn()} />);
    const summary = screen.getByLabelText("Explanation language: English");
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    summary.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });
});
