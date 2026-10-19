// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SelectedImage } from "./imageOcrTypes";
import useImageOcrFlow from "./useImageOcrFlow";

const flowMocks = vi.hoisted(() => ({
  prepareImageForOcr: vi.fn(async () => (
    new Blob(["image"], { type: "image/jpeg" })
  )),
  createOcrSession: vi.fn(),
  dispose: vi.fn(async () => {}),
  recognize: vi.fn(async () => ({ items: [] })),
  resultToText: vi.fn(() => "Recognized text"),
}));

vi.mock("./cropImage", () => ({
  prepareImageForOcr: flowMocks.prepareImageForOcr,
}));

vi.mock("./paddleOcr", () => ({
  createOcrSession: flowMocks.createOcrSession,
  resultToText: flowMocks.resultToText,
}));

function createSelectedImage(name = "lesson.jpg"): SelectedImage {
  return {
    crop: { unit: "%", x: 0, y: 0, width: 100, height: 100 },
    file: new File(["image"], name, { type: "image/jpeg" }),
    metadata: { format: "jpeg", width: 1600, height: 1200 },
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
});

afterEach(() => {
  cleanup();
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
    expect(flowMocks.prepareImageForOcr).toHaveBeenCalledWith(selectedImage);
    expect(flowMocks.createOcrSession).toHaveBeenCalledWith("en");
    expect(flowMocks.recognize).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(flowMocks.dispose).toHaveBeenCalledTimes(1));
  });

});
