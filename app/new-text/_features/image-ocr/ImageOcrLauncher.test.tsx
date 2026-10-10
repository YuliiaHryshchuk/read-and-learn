// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ImageOcrLauncher from "./ImageOcrLauncher";

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    <span aria-label={alt} data-image-src={src} role="img" />
  ),
}));

function renderLauncher() {
  return render(<ImageOcrLauncher />);
}

beforeEach(() => {
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn(() => "blob:test-image"),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: vi.fn(),
  });
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(URL, "createObjectURL");
  Reflect.deleteProperty(URL, "revokeObjectURL");
  Reflect.deleteProperty(navigator, "userAgentData");
});

describe("ImageOcrLauncher", () => {
  it("opens the image dialog and ignores backdrop clicks and Escape", async () => {
    const user = userEvent.setup();
    renderLauncher();

    await user.click(screen.getByRole("button", { name: "Extract text from image" }));
    const dialog = await screen.findByRole("dialog", {
      name: "Extract text from image",
    }) as HTMLDialogElement;

    fireEvent.click(dialog);
    const cancelEvent = new Event("cancel", {
      bubbles: false,
      cancelable: true,
    });
    fireEvent(dialog, cancelEvent);
    expect(cancelEvent.defaultPrevented).toBe(true);

    const escapeEvent = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    });
    fireEvent(dialog, escapeEvent);
    expect(escapeEvent.defaultPrevented).toBe(true);
    expect(screen.getByRole("dialog", { name: "Extract text from image" }))
      .toBeTruthy();

    await user.click(within(dialog).getByRole("button", {
      name: "Close image text dialog",
    }));
    expect(screen.queryByRole("dialog", { name: "Extract text from image" }))
      .toBeNull();
  });

  it("recovers if the browser closes the native dialog unexpectedly", async () => {
    const user = userEvent.setup();
    renderLauncher();

    await user.click(screen.getByRole("button", { name: "Extract text from image" }));
    const dialog = await screen.findByRole("dialog", {
      name: "Extract text from image",
    }) as HTMLDialogElement;

    dialog.close();
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Extract text from image" }))
        .toBeNull();
    });

    await user.click(screen.getByRole("button", { name: "Extract text from image" }));
    expect(await screen.findByRole("dialog", { name: "Extract text from image" }))
      .toBeTruthy();
  });

  it("hides the camera choice on desktop", async () => {
    const user = userEvent.setup();
    renderLauncher();

    await user.click(screen.getByRole("button", {
      name: "Extract text from image",
    }));
    const dialog = await screen.findByRole("dialog", { name: "Extract text from image" });

    expect(within(dialog).getByRole("button", { name: "Choose image" })).toBeTruthy();
    expect(within(dialog).queryByRole("button", { name: "Take a photo" })).toBeNull();
    expect(within(dialog).queryByRole("button", { name: "Add to text" })).toBeNull();
    expect(within(dialog).queryByRole("button", { name: "Replace text" })).toBeNull();
  });

  it("shows the camera choice on a mobile device", async () => {
    Object.defineProperty(navigator, "userAgentData", {
      configurable: true,
      value: { mobile: true },
    });
    const user = userEvent.setup();
    renderLauncher();

    await user.click(screen.getByRole("button", { name: "Extract text from image" }));
    const dialog = await screen.findByRole("dialog", { name: "Extract text from image" });

    expect(within(dialog).getByRole("button", { name: "Take a photo" })).toBeTruthy();
    expect(within(dialog).getByLabelText("Take a photo").getAttribute("capture"))
      .toBe("environment");
  });

  it("accepts one valid JPEG and shows its preview details", async () => {
    const user = userEvent.setup();
    renderLauncher();
    await user.click(screen.getByRole("button", { name: "Extract text from image" }));
    const dialog = await screen.findByRole("dialog", { name: "Extract text from image" });
    const file = new File(
      [new Uint8Array([0xff, 0xd8, 0xff, 0xe0])],
      "lesson.jpg",
      { type: "image/jpeg" },
    );

    await user.upload(within(dialog).getByLabelText("Choose image file"), file);

    expect(await within(dialog).findByText("lesson.jpg")).toBeTruthy();
    expect(within(dialog).getByRole("img", { name: "Selected image preview" }))
      .toBeTruthy();
    expect(URL.createObjectURL).toHaveBeenCalledWith(file);
  });

  it("replaces the preview when another valid image is selected", async () => {
    vi.mocked(URL.createObjectURL)
      .mockReturnValueOnce("blob:first-image")
      .mockReturnValueOnce("blob:second-image");
    const user = userEvent.setup();
    renderLauncher();
    await user.click(screen.getByRole("button", { name: "Extract text from image" }));
    const dialog = await screen.findByRole("dialog", { name: "Extract text from image" });
    const input = within(dialog).getByLabelText("Choose image file");
    const firstFile = new File(
      [new Uint8Array([0xff, 0xd8, 0xff, 0xe0])],
      "first.jpg",
      { type: "image/jpeg" },
    );
    const secondFile = new File(
      [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
      "second.png",
      { type: "image/png" },
    );

    await user.upload(input, firstFile);
    expect(await within(dialog).findByText("first.jpg")).toBeTruthy();
    await user.click(within(dialog).getByRole("button", {
      name: "Choose another image",
    }));
    await user.upload(within(dialog).getByLabelText("Choose image file"), secondFile);

    expect(await within(dialog).findByText("second.png")).toBeTruthy();
    expect(within(dialog).queryByText("first.jpg")).toBeNull();
    expect(within(dialog).getByRole("img", { name: "Selected image preview" })
      .getAttribute("data-image-src")).toBe("blob:second-image");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:first-image");
  });

  it("continues to the language step and keeps the image when going back", async () => {
    const user = userEvent.setup();
    renderLauncher();
    await user.click(screen.getByRole("button", { name: "Extract text from image" }));
    const dialog = await screen.findByRole("dialog", { name: "Extract text from image" });
    const file = new File(
      [new Uint8Array([0xff, 0xd8, 0xff, 0xe0])],
      "lesson.jpg",
      { type: "image/jpeg" },
    );

    const continueButton = within(dialog).getByRole("button", { name: "Continue" });
    expect(continueButton.hasAttribute("disabled")).toBe(true);
    await user.upload(within(dialog).getByLabelText("Choose image file"), file);
    await waitFor(() => expect(continueButton.hasAttribute("disabled")).toBe(false));

    await user.click(continueButton);
    expect(within(dialog).getByRole("heading", { name: "Choose the image language" }))
      .toBeTruthy();
    const languageDropdown = within(dialog).getByRole("combobox", {
      name: "Text language",
    });
    await user.click(languageDropdown);
    expect(within(dialog).getByRole("option", { name: "English" })).toBeTruthy();
    await user.click(within(dialog).getByRole("option", { name: "Russian" }));
    expect(languageDropdown.textContent).toContain("Russian");
    expect(within(dialog).getByRole("button", { name: "Recognize text" })
      .hasAttribute("disabled")).toBe(true);

    await user.click(within(dialog).getByRole("button", { name: "Back" }));
    expect(within(dialog).getByText("lesson.jpg")).toBeTruthy();
    await user.click(within(dialog).getByRole("button", { name: "Continue" }));
    expect(within(dialog).getByRole("combobox", { name: "Text language" }).textContent)
      .toContain("Russian");
  });

  it("rejects unsupported and oversized files", async () => {
    const user = userEvent.setup({ applyAccept: false });
    renderLauncher();
    await user.click(screen.getByRole("button", { name: "Extract text from image" }));
    const dialog = await screen.findByRole("dialog", { name: "Extract text from image" });
    const input = within(dialog).getByLabelText("Choose image file");
    const unsupported = new File(["GIF89a"], "image.gif", { type: "image/gif" });

    await user.upload(input, unsupported);
    expect((await within(dialog).findByRole("alert")).textContent)
      .toContain("Choose a JPEG, JPG, or PNG image.");

    const oversized = new File(
      [new Uint8Array([0xff, 0xd8, 0xff])],
      "large.jpg",
      { type: "image/jpeg" },
    );
    Object.defineProperty(oversized, "size", { value: 10 * 1024 * 1024 + 1 });
    await user.upload(input, oversized);
    expect((await within(dialog).findByRole("alert")).textContent)
      .toContain("Choose an image smaller than 10 MB.");
  });

  it("explains why an accepted JFIF cannot replace the selected image", async () => {
    const user = userEvent.setup();
    renderLauncher();
    await user.click(screen.getByRole("button", { name: "Extract text from image" }));
    const dialog = await screen.findByRole("dialog", { name: "Extract text from image" });
    const firstFile = new File(
      [new Uint8Array([0xff, 0xd8, 0xff, 0xe0])],
      "first.jpg",
      { type: "image/jpeg" },
    );
    const jfifFile = new File(
      [new Uint8Array([0xff, 0xd8, 0xff, 0xe0])],
      "replacement.jfif",
      { type: "image/jpeg" },
    );

    await user.upload(within(dialog).getByLabelText("Choose image file"), firstFile);
    expect(await within(dialog).findByText("first.jpg")).toBeTruthy();
    await user.click(within(dialog).getByRole("button", {
      name: "Choose another image",
    }));
    await user.upload(within(dialog).getByLabelText("Choose image file"), jfifFile);

    const alert = await within(dialog).findByRole("alert");
    expect(alert.textContent).toContain("Choose a JPEG, JPG, or PNG image.");
    expect(alert.textContent).toContain("The previous image is still selected.");
    expect(within(dialog).getByText("first.jpg")).toBeTruthy();
    expect(within(dialog).queryByText("replacement.jfif")).toBeNull();
  });

});
