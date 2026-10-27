// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTextStore } from "@/stores/useTextStore";
import SaveToLibrary from "./SaveToLibrary";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  requireAuthToken: vi.fn(async () => "token"),
  saveMaterial: vi.fn(async () => ({ id: "material-1" })),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock("@/components/PuterAuthProvider", () => ({
  usePuterAuth: () => ({ requireAuthToken: mocks.requireAuthToken }),
}));

vi.mock("@/lib/api/materialsClient", () => ({
  saveMaterial: mocks.saveMaterial,
}));

beforeEach(() => {
  vi.clearAllMocks();
  useTextStore.setState({
    text: "Hola mundo",
    result: {
      kind: "structured",
      sourceText: "Hola mundo",
      fragments: [],
    },
    targetLanguage: "English",
    resultLanguage: "English",
    editingMaterial: null,
    hasUnsavedGeneration: false,
    hasHydrated: true,
  });
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute("open");
  };
});

afterEach(cleanup);

describe("SaveToLibrary", () => {
  it("keeps the completed material visible until navigation unmounts the page", async () => {
    const user = userEvent.setup();
    const view = render(<SaveToLibrary />);

    await user.click(screen.getByRole("button", { name: "Save to my library" }));
    await user.type(screen.getByRole("textbox", { name: "Text title" }), "Lesson");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/library"));
    expect(screen.getByRole("button", { name: "Opening library…" }))
      .toHaveProperty("disabled", true);
    expect(useTextStore.getState().text).toBe("Hola mundo");
    expect(useTextStore.getState().result).not.toBeNull();

    view.unmount();

    expect(useTextStore.getState().text).toBe("");
    expect(useTextStore.getState().result).toBeNull();
  });

  it("disables browser autofill for the material title", async () => {
    const user = userEvent.setup();
    render(<SaveToLibrary />);

    await user.click(screen.getByRole("button", { name: "Save to my library" }));

    const titleInput = screen.getByRole("textbox", { name: "Text title" });
    expect(titleInput.getAttribute("autocomplete")).toBe("off");
    expect(titleInput.closest("form")?.getAttribute("autocomplete")).toBe("off");
  });
});
