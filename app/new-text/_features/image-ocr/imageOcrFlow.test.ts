// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import {
  createInitialImageOcrFlowState,
  imageOcrFlowReducer,
  type ImageOcrFlowState,
} from "./imageOcrFlow";
import type { SelectedImage } from "./imageOcrTypes";

function createSelectedImage(name = "lesson.jpg"): SelectedImage {
  return {
    crop: { unit: "%", x: 10, y: 15, width: 70, height: 60 },
    file: new File(["image"], name, { type: "image/jpeg" }),
    metadata: { format: "jpeg", width: 1600, height: 1200 },
    rotation: 90,
  };
}

function reduce(
  state: ImageOcrFlowState,
  ...events: Parameters<typeof imageOcrFlowReducer>[1][]
) {
  return events.reduce(imageOcrFlowReducer, state);
}

describe("imageOcrFlowReducer", () => {
  it("creates the language step with an optional preferred language", () => {
    expect(createInitialImageOcrFlowState("")).toEqual({
      status: "language",
      selectedLanguage: "",
      selectedImage: null,
    });
    expect(createInitialImageOcrFlowState("es")).toEqual({
      status: "language",
      selectedLanguage: "es",
      selectedImage: null,
    });
  });

  it("enforces the language and image prerequisites", () => {
    const initialState = createInitialImageOcrFlowState("");
    const withoutLanguage = imageOcrFlowReducer(initialState, {
      type: "CONTINUE_TO_IMAGE",
    });
    expect(withoutLanguage).toBe(initialState);

    const imageState = reduce(
      initialState,
      { type: "SELECT_LANGUAGE", language: "en" },
      { type: "CONTINUE_TO_IMAGE" },
    );
    expect(imageState).toEqual({
      status: "image",
      selectedLanguage: "en",
      selectedImage: null,
    });

    const withoutImage = imageOcrFlowReducer(imageState, {
      type: "START_RECOGNITION",
      attemptId: 1,
    });
    expect(withoutImage).toBe(imageState);
  });

  it("preserves the selected image when navigating back through language", () => {
    const selectedImage = createSelectedImage();
    const imageState = reduce(
      createInitialImageOcrFlowState("es"),
      { type: "CONTINUE_TO_IMAGE" },
      { type: "SELECT_IMAGE", image: selectedImage },
      { type: "BACK_TO_LANGUAGE" },
      { type: "CONTINUE_TO_IMAGE" },
    );

    expect(imageState).toEqual({
      status: "image",
      selectedLanguage: "es",
      selectedImage,
    });
  });

  it("moves a successful attempt to an editable review state", () => {
    const selectedImage = createSelectedImage();
    const recognizingState = reduce(
      createInitialImageOcrFlowState("en"),
      { type: "CONTINUE_TO_IMAGE" },
      { type: "SELECT_IMAGE", image: selectedImage },
      { type: "START_RECOGNITION", attemptId: 4 },
    );

    const staleResult = imageOcrFlowReducer(recognizingState, {
      type: "RECOGNITION_SUCCEEDED",
      attemptId: 3,
      text: "Stale text",
    });
    expect(staleResult).toBe(recognizingState);

    const reviewState = reduce(
      recognizingState,
      {
        type: "RECOGNITION_SUCCEEDED",
        attemptId: 4,
        text: "Recognized text",
      },
      { type: "EDIT_RECOGNIZED_TEXT", text: "Corrected text" },
    );
    expect(reviewState).toEqual({
      status: "review",
      selectedLanguage: "en",
      selectedImage,
      recognizedText: "Corrected text",
    });
  });

  it("keeps recognition errors scoped to their attempt and supports retry", () => {
    const selectedImage = createSelectedImage();
    const firstAttempt = reduce(
      createInitialImageOcrFlowState("de"),
      { type: "CONTINUE_TO_IMAGE" },
      { type: "SELECT_IMAGE", image: selectedImage },
      { type: "START_RECOGNITION", attemptId: 1 },
    );
    const errorState = imageOcrFlowReducer(firstAttempt, {
      type: "RECOGNITION_FAILED",
      attemptId: 1,
      message: "Recognition failed.",
    });
    expect(errorState).toEqual({
      status: "error",
      selectedLanguage: "de",
      selectedImage,
      message: "Recognition failed.",
    });

    const secondAttempt = reduce(
      errorState,
      { type: "BACK_TO_IMAGE" },
      { type: "START_RECOGNITION", attemptId: 2 },
    );
    const staleFailure = imageOcrFlowReducer(secondAttempt, {
      type: "RECOGNITION_FAILED",
      attemptId: 1,
      message: "Old failure",
    });
    expect(staleFailure).toBe(secondAttempt);

    expect(imageOcrFlowReducer(secondAttempt, {
      type: "RECOGNITION_SUCCEEDED",
      attemptId: 2,
      text: "Retry result",
    })).toEqual({
      status: "review",
      selectedLanguage: "de",
      selectedImage,
      recognizedText: "Retry result",
    });
  });

  it("ignores events that are invalid for the current state", () => {
    const languageState = createInitialImageOcrFlowState("fr");

    expect(imageOcrFlowReducer(languageState, {
      type: "EDIT_RECOGNIZED_TEXT",
      text: "Unexpected",
    })).toBe(languageState);
    expect(imageOcrFlowReducer(languageState, {
      type: "BACK_TO_IMAGE",
    })).toBe(languageState);
    expect(imageOcrFlowReducer(languageState, {
      type: "SELECT_IMAGE",
      image: createSelectedImage(),
    })).toBe(languageState);
  });
});
