import type { SelectedImage } from "./imageOcrTypes";
import type { OcrLanguage } from "./ocrLanguages";

type LanguageState = {
  status: "language";
  selectedLanguage: OcrLanguage | "";
  selectedImage: SelectedImage | null;
};

type ImageState = {
  status: "image";
  selectedLanguage: OcrLanguage;
  selectedImage: SelectedImage | null;
};

type RecognizingState = {
  status: "recognizing";
  selectedLanguage: OcrLanguage;
  selectedImage: SelectedImage;
  attemptId: number;
};

type RecognitionErrorState = {
  status: "error";
  selectedLanguage: OcrLanguage;
  selectedImage: SelectedImage;
  message: string;
};

type ReviewState = {
  status: "review";
  selectedLanguage: OcrLanguage;
  selectedImage: SelectedImage;
  recognizedText: string;
};

export type ImageOcrFlowState =
  | LanguageState
  | ImageState
  | RecognizingState
  | RecognitionErrorState
  | ReviewState;

export type ImageOcrFlowEvent =
  | { type: "SELECT_LANGUAGE"; language: OcrLanguage | "" }
  | { type: "CONTINUE_TO_IMAGE" }
  | { type: "BACK_TO_LANGUAGE" }
  | { type: "SELECT_IMAGE"; image: SelectedImage | null }
  | { type: "START_RECOGNITION"; attemptId: number }
  | { type: "RECOGNITION_SUCCEEDED"; attemptId: number; text: string }
  | { type: "RECOGNITION_FAILED"; attemptId: number; message: string }
  | { type: "BACK_TO_IMAGE" }
  | { type: "EDIT_RECOGNIZED_TEXT"; text: string };

export function createInitialImageOcrFlowState(
  selectedLanguage: OcrLanguage | "",
): ImageOcrFlowState {
  return {
    status: "language",
    selectedLanguage,
    selectedImage: null,
  };
}

export function imageOcrFlowReducer(
  state: ImageOcrFlowState,
  event: ImageOcrFlowEvent,
): ImageOcrFlowState {
  switch (event.type) {
    case "SELECT_LANGUAGE":
      if (state.status !== "language") return state;
      return { ...state, selectedLanguage: event.language };

    case "CONTINUE_TO_IMAGE":
      if (state.status !== "language" || !state.selectedLanguage) return state;
      return {
        status: "image",
        selectedLanguage: state.selectedLanguage,
        selectedImage: state.selectedImage,
      };

    case "BACK_TO_LANGUAGE":
      if (state.status !== "image") return state;
      return {
        status: "language",
        selectedLanguage: state.selectedLanguage,
        selectedImage: state.selectedImage,
      };

    case "SELECT_IMAGE":
      if (state.status !== "image") return state;
      return { ...state, selectedImage: event.image };

    case "START_RECOGNITION":
      if (state.status !== "image" || !state.selectedImage) return state;
      return {
        status: "recognizing",
        selectedLanguage: state.selectedLanguage,
        selectedImage: state.selectedImage,
        attemptId: event.attemptId,
      };

    case "RECOGNITION_SUCCEEDED":
      if (
        state.status !== "recognizing" ||
        state.attemptId !== event.attemptId
      ) {
        return state;
      }
      return {
        status: "review",
        selectedLanguage: state.selectedLanguage,
        selectedImage: state.selectedImage,
        recognizedText: event.text,
      };

    case "RECOGNITION_FAILED":
      if (
        state.status !== "recognizing" ||
        state.attemptId !== event.attemptId
      ) {
        return state;
      }
      return {
        status: "error",
        selectedLanguage: state.selectedLanguage,
        selectedImage: state.selectedImage,
        message: event.message,
      };

    case "BACK_TO_IMAGE":
      if (state.status !== "error" && state.status !== "review") return state;
      return {
        status: "image",
        selectedLanguage: state.selectedLanguage,
        selectedImage: state.selectedImage,
      };

    case "EDIT_RECOGNIZED_TEXT":
      if (state.status !== "review") return state;
      return { ...state, recognizedText: event.text };
  }
}
