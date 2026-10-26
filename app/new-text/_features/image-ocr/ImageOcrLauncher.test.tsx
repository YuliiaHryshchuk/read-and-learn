// @vitest-environment jsdom

import {
  act,
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

vi.mock("./cropImage", () => ({
  prepareImageForOcr: vi.fn(async () => new Blob(["image"], { type: "image/jpeg" })),
}));

const JPEG_BYTES = new Uint8Array([
  0xff, 0xd8,
  0xff, 0xc0, 0x00, 0x11, 0x08,
  0x03, 0x00,
  0x04, 0x00,
  0x03,
  0x01, 0x11, 0x00,
  0x02, 0x11, 0x00,
  0x03, 0x11, 0x00,
  0xff, 0xd9,
]);

const PNG_BYTES = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d,
  0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x04, 0x00,
  0x00, 0x00, 0x03, 0x00,
]);

const ocrMocks = vi.hoisted(() => {
  const dispose = vi.fn(async () => {});
  const recognize = vi.fn(async () => ({ items: [] }));

  return {
    containsRecognizableText: (text: string) => /[\p{L}\p{N}]/u.test(text),
    createOcrSession: vi.fn(async () => ({ dispose, recognize })),
    dispose,
    recognize,
    resultToText: vi.fn(() => "Hola mundo"),
  };
});

const previewMocks = vi.hoisted(() => ({
  close: vi.fn(),
}));

vi.mock("./paddleOcr", () => ({
  containsRecognizableText: ocrMocks.containsRecognizableText,
  createOcrSession: ocrMocks.createOcrSession,
  resultToText: ocrMocks.resultToText,
}));

function renderLauncher({
  text = "",
  onTextChange = vi.fn(),
}: {
  text?: string;
  onTextChange?: (text: string) => void;
} = {}) {
  return render(
    <ImageOcrLauncher text={text} onTextChange={onTextChange} />,
  );
}

async function chooseLanguageAndContinue(
  dialog: HTMLElement,
  user: ReturnType<typeof userEvent.setup>,
  language = "English",
) {
  const dropdown = within(dialog).getByRole("combobox", {
    name: "Text language",
  });
  if (!dropdown.textContent?.includes(language)) {
    await user.click(dropdown);
    await user.click(within(dialog).getByRole("option", { name: language }));
  }
  await user.click(within(dialog).getByRole("button", { name: "Continue" }));
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  ocrMocks.createOcrSession.mockImplementation(async () => ({
    dispose: ocrMocks.dispose,
    recognize: ocrMocks.recognize,
  }));
  ocrMocks.dispose.mockResolvedValue(undefined);
  ocrMocks.recognize.mockResolvedValue({ items: [] });
  ocrMocks.resultToText.mockReturnValue("Hola mundo");
  Object.defineProperty(globalThis, "createImageBitmap", {
    configurable: true,
    value: vi.fn(async (_file: Blob, options?: ImageBitmapOptions) => ({
      close: previewMocks.close,
      height: options?.resizeHeight ?? 900,
      width: options?.resizeWidth ?? 1200,
    })),
  });
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    configurable: true,
    value: vi.fn(() => ({
      drawImage: vi.fn(),
      fillRect: vi.fn(),
      fillStyle: "",
      imageSmoothingEnabled: false,
      imageSmoothingQuality: "low",
      setTransform: vi.fn(),
    })),
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
  vi.useRealTimers();
  cleanup();
  Reflect.deleteProperty(globalThis, "createImageBitmap");
  Reflect.deleteProperty(HTMLCanvasElement.prototype, "getContext");
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
    await chooseLanguageAndContinue(dialog, user);

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
    await chooseLanguageAndContinue(dialog, user);

    expect(within(dialog).getByRole("button", { name: "Take a photo" })).toBeTruthy();
    expect(within(dialog).getByLabelText("Take a photo").getAttribute("capture"))
      .toBe("environment");
  });

  it("accepts one valid JPEG and shows its preview details", async () => {
    const user = userEvent.setup();
    renderLauncher();
    await user.click(screen.getByRole("button", { name: "Extract text from image" }));
    const dialog = await screen.findByRole("dialog", { name: "Extract text from image" });
    await chooseLanguageAndContinue(dialog, user);
    const file = new File(
      [JPEG_BYTES],
      "lesson.jpg",
      { type: "image/jpeg" },
    );

    await user.upload(within(dialog).getByLabelText("Choose image file"), file);

    expect(await within(dialog).findByText("lesson.jpg")).toBeTruthy();
    expect(within(dialog).getByRole("img", { name: "Selected image preview" }))
      .toBeTruthy();
    await waitFor(() => expect(createImageBitmap).toHaveBeenCalledWith(
      file,
      expect.objectContaining({ resizeHeight: 768, resizeWidth: 1024 }),
    ));
  });

  it("lets the user rotate the selected image after choosing a language", async () => {
    const user = userEvent.setup();
    renderLauncher();
    await user.click(screen.getByRole("button", { name: "Extract text from image" }));
    const dialog = await screen.findByRole("dialog", { name: "Extract text from image" });
    await chooseLanguageAndContinue(dialog, user);
    const file = new File(
      [JPEG_BYTES],
      "lesson.jpg",
      { type: "image/jpeg" },
    );

    await user.upload(within(dialog).getByLabelText("Choose image file"), file);
    const rotateButton = await within(dialog).findByRole("button", {
      name: "Rotate 90°",
    });
    const preview = within(dialog).getByRole("img", {
      name: "Selected image preview",
    });

    expect(preview.getAttribute("data-rotation")).toBe("0");
    await user.click(rotateButton);
    expect(preview.getAttribute("data-rotation")).toBe("90");
    expect(within(dialog).getByText("Image rotation: 90°")).toBeTruthy();
  });

  it("replaces the preview when another valid image is selected", async () => {
    const user = userEvent.setup();
    renderLauncher();
    await user.click(screen.getByRole("button", { name: "Extract text from image" }));
    const dialog = await screen.findByRole("dialog", { name: "Extract text from image" });
    await chooseLanguageAndContinue(dialog, user);
    const input = within(dialog).getByLabelText("Choose image file");
    const firstFile = new File(
      [JPEG_BYTES],
      "first.jpg",
      { type: "image/jpeg" },
    );
    const secondFile = new File(
      [PNG_BYTES],
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
      .getAttribute("data-file-name")).toBe("second.png");
    await waitFor(() => expect(previewMocks.close).toHaveBeenCalledTimes(1));
  });

  it("does not decode a preview when the dialog closes during validation", async () => {
    let resolveBytes!: (bytes: ArrayBuffer) => void;
    const pendingBytes = new Promise<ArrayBuffer>((resolve) => {
      resolveBytes = resolve;
    });
    const user = userEvent.setup();
    renderLauncher();
    await user.click(screen.getByRole("button", { name: "Extract text from image" }));
    const dialog = await screen.findByRole("dialog", { name: "Extract text from image" });
    await chooseLanguageAndContinue(dialog, user);
    const file = new File(
      [JPEG_BYTES],
      "pending.jpg",
      { type: "image/jpeg" },
    );
    Object.defineProperty(file, "slice", {
      value: () => ({ arrayBuffer: () => pendingBytes }),
    });

    await user.upload(within(dialog).getByLabelText("Choose image file"), file);
    await user.click(within(dialog).getByRole("button", {
      name: "Close image text dialog",
    }));
    await act(async () => {
      resolveBytes(Uint8Array.from([0xff, 0xd8, 0xff]).buffer);
      await pendingBytes;
    });

    expect(createImageBitmap).not.toHaveBeenCalled();
  });

  it("chooses a supported language before selecting an image", async () => {
    const user = userEvent.setup();
    renderLauncher();
    await user.click(screen.getByRole("button", { name: "Extract text from image" }));
    const dialog = await screen.findByRole("dialog", { name: "Extract text from image" });
    const continueButton = within(dialog).getByRole("button", { name: "Continue" });
    expect(continueButton.hasAttribute("disabled")).toBe(true);
    expect(within(dialog).getByRole("heading", { name: "Choose the image language" }))
      .toBeTruthy();
    const languageDropdown = within(dialog).getByRole("combobox", {
      name: "Text language",
    });
    await user.click(languageDropdown);
    expect(within(dialog).getByRole("option", { name: "English" })).toBeTruthy();
    expect(within(dialog).getByRole("option", { name: "Spanish" })).toBeTruthy();
    expect(within(dialog).getByRole("option", { name: "French" })).toBeTruthy();
    expect(within(dialog).getByRole("option", { name: "German" })).toBeTruthy();
    expect(within(dialog).queryByRole("option", { name: "Russian" })).toBeNull();
    await user.click(within(dialog).getByRole("option", { name: "Spanish" }));
    expect(languageDropdown.textContent).toContain("Spanish");
    expect(localStorage.getItem("preferredStudyLanguage")).toBe("es");
    expect(continueButton.hasAttribute("disabled")).toBe(false);

    await user.click(continueButton);
    expect(within(dialog).getByRole("button", { name: "Choose image" })).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Recognize text" })
      .hasAttribute("disabled")).toBe(true);
    await user.click(within(dialog).getByRole("button", { name: "Back" }));
    expect(within(dialog).getByRole("combobox", { name: "Text language" }).textContent)
      .toContain("Spanish");
  });

  it("uses the preferred study language as the image-language default", async () => {
    localStorage.setItem("preferredStudyLanguage", "es");
    const user = userEvent.setup();
    renderLauncher();

    await user.click(screen.getByRole("button", { name: "Extract text from image" }));
    const dialog = await screen.findByRole("dialog", { name: "Extract text from image" });

    expect(within(dialog).getByRole("combobox", { name: "Text language" }).textContent)
      .toContain("Spanish");
    expect(within(dialog).getByRole("button", { name: "Continue" })
      .hasAttribute("disabled")).toBe(false);
  });

  it("preserves the selected image when navigating back through language", async () => {
    const user = userEvent.setup();
    renderLauncher();
    await user.click(screen.getByRole("button", { name: "Extract text from image" }));
    const dialog = await screen.findByRole("dialog", { name: "Extract text from image" });
    await chooseLanguageAndContinue(dialog, user, "Spanish");
    const file = new File(
      [JPEG_BYTES],
      "preserved.jpg",
      { type: "image/jpeg" },
    );

    await user.upload(within(dialog).getByLabelText("Choose image file"), file);
    expect(await within(dialog).findByText("preserved.jpg")).toBeTruthy();
    await user.click(within(dialog).getByRole("button", { name: "Back" }));

    expect(within(dialog).getByRole("combobox", { name: "Text language" }).textContent)
      .toContain("Spanish");
    await user.click(within(dialog).getByRole("button", { name: "Continue" }));

    expect(within(dialog).getByText("preserved.jpg")).toBeTruthy();
  });

  it("recognizes the cropped image and sends reviewed text to the editor", async () => {
    const onTextChange = vi.fn();
    const user = userEvent.setup();
    renderLauncher({ onTextChange });
    await user.click(screen.getByRole("button", { name: "Extract text from image" }));
    const dialog = await screen.findByRole("dialog", { name: "Extract text from image" });
    await chooseLanguageAndContinue(dialog, user, "Spanish");
    const file = new File(
      [JPEG_BYTES],
      "spanish.jpg",
      { type: "image/jpeg" },
    );

    await user.upload(within(dialog).getByLabelText("Choose image file"), file);
    await user.click(within(dialog).getByRole("button", { name: "Recognize text" }));

    const result = await within(dialog).findByLabelText("Recognized text");
    expect((result as HTMLTextAreaElement).value).toBe("Hola mundo");
    await waitFor(() => expect(ocrMocks.dispose).toHaveBeenCalledTimes(1));
    await user.click(within(dialog).getByRole("button", { name: "Use text" }));

    expect(onTextChange).toHaveBeenCalledWith("Hola mundo");
    expect(screen.queryByRole("dialog", { name: "Extract text from image" }))
      .toBeNull();
  });

  it("shows a warning below punctuation-only recognized text", async () => {
    ocrMocks.resultToText.mockReturnValueOnce("... , — -");
    const user = userEvent.setup();
    renderLauncher();
    await user.click(screen.getByRole("button", { name: "Extract text from image" }));
    const dialog = await screen.findByRole("dialog", { name: "Extract text from image" });
    await chooseLanguageAndContinue(dialog, user);
    const file = new File(
      [JPEG_BYTES],
      "punctuation.jpg",
      { type: "image/jpeg" },
    );

    await user.upload(within(dialog).getByLabelText("Choose image file"), file);
    await user.click(within(dialog).getByRole("button", { name: "Recognize text" }));

    const result = await within(dialog).findByLabelText("Recognized text");
    expect((result as HTMLTextAreaElement).value).toBe("... , — -");
    expect(within(dialog).getByRole("alert").textContent).toContain(
      "Try another language or a higher-quality photo.",
    );
  });

  it("moves to a locked result step while recognition is running", async () => {
    let resolveRecognition!: (result: { items: never[] }) => void;
    const pendingRecognition = new Promise<{ items: never[] }>((resolve) => {
      resolveRecognition = resolve;
    });
    ocrMocks.recognize.mockReturnValueOnce(pendingRecognition);
    const user = userEvent.setup();
    renderLauncher();
    await user.click(screen.getByRole("button", { name: "Extract text from image" }));
    const dialog = await screen.findByRole("dialog", { name: "Extract text from image" });
    await chooseLanguageAndContinue(dialog, user);
    const file = new File(
      [JPEG_BYTES],
      "pending.jpg",
      { type: "image/jpeg" },
    );

    await user.upload(within(dialog).getByLabelText("Choose image file"), file);
    await user.click(within(dialog).getByRole("button", { name: "Recognize text" }));

    expect(within(dialog).getByText("Step 3 of 3")).toBeTruthy();
    expect(within(dialog).getByRole("heading", { name: "Recognizing…" }))
      .toBeTruthy();
    expect(within(dialog).queryByRole("button", { name: "Back" })).toBeNull();
    expect(within(dialog).queryByRole("button", { name: "Recognize text" })).toBeNull();
    expect(within(dialog).queryByRole("button", { name: "Choose another image" }))
      .toBeNull();

    await act(async () => {
      resolveRecognition({ items: [] });
      await pendingRecognition;
    });
    expect(await within(dialog).findByLabelText("Recognized text")).toBeTruthy();
  });

  it("shows an error when recognition never finishes", async () => {
    ocrMocks.recognize.mockReturnValueOnce(new Promise(() => {}));
    const user = userEvent.setup();
    renderLauncher();
    await user.click(screen.getByRole("button", { name: "Extract text from image" }));
    const dialog = await screen.findByRole("dialog", { name: "Extract text from image" });
    await chooseLanguageAndContinue(dialog, user);
    const file = new File(
      [JPEG_BYTES],
      "hanging.jpg",
      { type: "image/jpeg" },
    );

    await user.upload(within(dialog).getByLabelText("Choose image file"), file);
    vi.useFakeTimers();
    fireEvent.click(within(dialog).getByRole("button", { name: "Recognize text" }));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(within(dialog).getByRole("heading", { name: "Recognizing…" }))
      .toBeTruthy();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(120_000);
    });

    const alert = within(dialog).getByRole("alert");
    expect(alert.textContent).toContain("Text recognition took too long");
    expect(within(dialog).getByRole("button", { name: "Back to image" }))
      .toBeTruthy();
    expect(ocrMocks.dispose).toHaveBeenCalledTimes(1);
  });

  it("shows recognition errors on the result step and returns to the image", async () => {
    ocrMocks.recognize.mockRejectedValueOnce(new Error("Recognition failed."));
    const user = userEvent.setup();
    renderLauncher();
    await user.click(screen.getByRole("button", { name: "Extract text from image" }));
    const dialog = await screen.findByRole("dialog", { name: "Extract text from image" });
    await chooseLanguageAndContinue(dialog, user);
    const file = new File(
      [JPEG_BYTES],
      "failed.jpg",
      { type: "image/jpeg" },
    );

    await user.upload(within(dialog).getByLabelText("Choose image file"), file);
    await user.click(within(dialog).getByRole("button", { name: "Recognize text" }));

    const alert = await within(dialog).findByRole("alert");
    expect(alert.textContent).toContain("Text could not be recognized");
    expect(alert.textContent).toContain("Recognition failed.");
    await user.click(within(dialog).getByRole("button", { name: "Back to image" }));
    expect(within(dialog).getByText("failed.jpg")).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Recognize text" })).toBeTruthy();
  });

  it("disposes a pending OCR worker when the dialog closes", async () => {
    let resolveSession!: (session: {
      dispose: typeof ocrMocks.dispose;
      recognize: typeof ocrMocks.recognize;
    }) => void;
    const pendingSession = new Promise<{
      dispose: typeof ocrMocks.dispose;
      recognize: typeof ocrMocks.recognize;
    }>((resolve) => {
      resolveSession = resolve;
    });
    ocrMocks.createOcrSession.mockReturnValueOnce(pendingSession);
    const user = userEvent.setup();
    renderLauncher();
    await user.click(screen.getByRole("button", { name: "Extract text from image" }));
    const dialog = await screen.findByRole("dialog", { name: "Extract text from image" });
    await chooseLanguageAndContinue(dialog, user);
    const file = new File(
      [JPEG_BYTES],
      "pending.jpg",
      { type: "image/jpeg" },
    );

    await user.upload(within(dialog).getByLabelText("Choose image file"), file);
    await user.click(within(dialog).getByRole("button", { name: "Recognize text" }));
    await waitFor(() => expect(ocrMocks.createOcrSession).toHaveBeenCalledTimes(1));
    expect(within(dialog).getByRole("heading", { name: "Recognizing…" }))
      .toBeTruthy();

    await user.click(within(dialog).getByRole("button", {
      name: "Close image text dialog",
    }));
    await act(async () => {
      resolveSession({
        dispose: ocrMocks.dispose,
        recognize: ocrMocks.recognize,
      });
      await pendingSession;
    });

    await waitFor(() => expect(ocrMocks.dispose).toHaveBeenCalledTimes(1));
    expect(ocrMocks.recognize).not.toHaveBeenCalled();
  });

  it("rejects unsupported and oversized files", async () => {
    const user = userEvent.setup({ applyAccept: false });
    renderLauncher();
    await user.click(screen.getByRole("button", { name: "Extract text from image" }));
    const dialog = await screen.findByRole("dialog", { name: "Extract text from image" });
    await chooseLanguageAndContinue(dialog, user);
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
    await chooseLanguageAndContinue(dialog, user);
    const firstFile = new File(
      [JPEG_BYTES],
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
