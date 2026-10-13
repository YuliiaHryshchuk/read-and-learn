// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SelectedImage } from "./ImagePicker";
import useImageOcrFlow from "./useImageOcrFlow";

const flowMocks = vi.hoisted(() => ({
  createCroppedImageBlob: vi.fn(async () => (
    new Blob(["image"], { type: "image/jpeg" })
  )),
  createOcrSession: vi.fn(),
  dispose: vi.fn(async () => {}),
  recognize: vi.fn(async () => ({ items: [] })),
  resultToText: vi.fn(() => "Recognized text"),
}));

vi.mock("./cropImage", () => ({
  createCroppedImageBlob: flowMocks.createCroppedImageBlob,
}));

vi.mock("./paddleOcr", () => ({
  createOcrSession: flowMocks.createOcrSession,
  resultToText: flowMocks.resultToText,
}));

function createSelectedImage(name = "lesson.jpg"): SelectedImage {
  return {
    crop: { unit: "%", x: 0, y: 0, width: 100, height: 100 },
    file: new File(["image"], name, { type: "image/jpeg" }),
    previewUrl: `blob:${name}`,
    rotation: 0,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  flowMocks.createOcrSession.mockImplementation(async () => ({
    dispose: flowMocks.dispose,
    recognize: flowMocks.recognize,
  }));
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(URL, "revokeObjectURL");
});

describe("useImageOcrFlow", () => {
  it("initializes from a supported preferred study language", () => {
    localStorage.setItem("preferredStudyLanguage", "es");
    const { result } = renderHook(() => useImageOcrFlow());

    expect(result.current.state).toEqual({
      status: "language",
      selectedLanguage: "es",
      selectedImage: null,
    });

    act(() => result.current.continueToImage());
    expect(result.current.state.status).toBe("image");
  });

  it("ignores an unsupported preferred language", () => {
    localStorage.setItem("preferredStudyLanguage", "ru");
    const { result } = renderHook(() => useImageOcrFlow());

    expect(result.current.state).toEqual({
      status: "language",
      selectedLanguage: "",
      selectedImage: null,
    });
  });

  it("stores language changes and completes recognition", async () => {
    const selectedImage = createSelectedImage();
    const { result } = renderHook(() => useImageOcrFlow());

    act(() => result.current.selectLanguage("en"));
    expect(localStorage.getItem("preferredStudyLanguage")).toBe("en");
    act(() => result.current.continueToImage());
    act(() => result.current.selectImage(selectedImage));
    act(() => result.current.startRecognition());

    expect(result.current.state.status).toBe("recognizing");
    await waitFor(() => expect(result.current.state.status).toBe("review"));
    expect(result.current.state).toEqual({
      status: "review",
      selectedLanguage: "en",
      selectedImage,
      recognizedText: "Recognized text",
    });
    expect(flowMocks.createCroppedImageBlob).toHaveBeenCalledWith(selectedImage);
    expect(flowMocks.createOcrSession).toHaveBeenCalledWith("en");
    expect(flowMocks.recognize).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(flowMocks.dispose).toHaveBeenCalledTimes(1));
  });

  it("revokes replaced and unmounted image preview URLs", () => {
    const firstImage = createSelectedImage("first.jpg");
    const secondImage = createSelectedImage("second.jpg");
    const { result, unmount } = renderHook(() => useImageOcrFlow());

    act(() => result.current.selectLanguage("en"));
    act(() => result.current.continueToImage());
    act(() => result.current.selectImage(firstImage));
    act(() => result.current.selectImage(secondImage));

    expect(URL.revokeObjectURL).toHaveBeenCalledWith(firstImage.previewUrl);
    expect(URL.revokeObjectURL).not.toHaveBeenCalledWith(secondImage.previewUrl);

    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(secondImage.previewUrl);
  });
});
