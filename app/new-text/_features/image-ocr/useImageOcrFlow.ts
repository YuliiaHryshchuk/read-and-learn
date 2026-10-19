"use client";

import { useEffect, useReducer, useRef } from "react";
import {
  readLanguagePreference,
  STUDY_LANGUAGE_PREFERENCE_KEY,
  writeLanguagePreference,
} from "@/lib/languagePreferences";
import { prepareImageForOcr } from "./cropImage";
import {
  createInitialImageOcrFlowState,
  imageOcrFlowReducer,
} from "./imageOcrFlow";
import type { SelectedImage } from "./imageOcrTypes";
import { isOcrLanguage, type OcrLanguage } from "./ocrLanguages";
import { createOcrSession, resultToText, type OcrSession } from "./paddleOcr";

const RECOGNITION_TIMEOUT_MS = 120_000;

class RecognitionTimeoutError extends Error {
  constructor() {
    super(
      "Text recognition took too long. This browser may not support local recognition. Try another browser or image.",
    );
    this.name = "RecognitionTimeoutError";
  }
}

function getRecognitionError(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "Text recognition failed. Please try again.";
}

function disposeSession(sessionPromise: Promise<OcrSession>) {
  void sessionPromise.then((session) => session.dispose()).catch(() => {});
}

function raceWithAbort<T>(operation: Promise<T>, signal: AbortSignal) {
  if (signal.aborted) return Promise.reject(signal.reason);

  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener("abort", abort, { once: true });

    operation.then(
      (value) => {
        signal.removeEventListener("abort", abort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener("abort", abort);
        reject(error);
      },
    );
  });
}

function getPreferredStudyLanguage(): OcrLanguage | "" {
  const language = readLanguagePreference(STUDY_LANGUAGE_PREFERENCE_KEY);
  return language && isOcrLanguage(language) ? language : "";
}

export default function useImageOcrFlow() {
  const [state, dispatch] = useReducer(
    imageOcrFlowReducer,
    undefined,
    () => createInitialImageOcrFlowState(getPreferredStudyLanguage()),
  );
  const nextAttemptIdRef = useRef(0);
  useEffect(() => {
    if (state.status !== "recognizing") return;

    const { attemptId, selectedImage, selectedLanguage } = state;
    const recognitionController = new AbortController();
    let sessionPromise: Promise<OcrSession> | null = null;
    let disposalStarted = false;
    let effectWasCleanedUp = false;

    const disposeActiveSession = () => {
      if (!sessionPromise || disposalStarted) return;
      disposalStarted = true;
      disposeSession(sessionPromise);
    };
    const timeoutId = window.setTimeout(() => {
      recognitionController.abort(new RecognitionTimeoutError());
    }, RECOGNITION_TIMEOUT_MS);

    async function recognize() {
      try {
        const recognition = (async () => {
          const image = await prepareImageForOcr(selectedImage);
          recognitionController.signal.throwIfAborted();

          sessionPromise = createOcrSession(selectedLanguage);
          const session = await sessionPromise;
          recognitionController.signal.throwIfAborted();

          return session.recognize(image);
        })();
        const result = await raceWithAbort(
          recognition,
          recognitionController.signal,
        );
        if (effectWasCleanedUp) return;

        dispatch({
          type: "RECOGNITION_SUCCEEDED",
          attemptId,
          text: resultToText(result),
        });
      } catch (error) {
        if (effectWasCleanedUp) return;
        dispatch({
          type: "RECOGNITION_FAILED",
          attemptId,
          message: getRecognitionError(error),
        });
      } finally {
        window.clearTimeout(timeoutId);
        disposeActiveSession();
      }
    }

    void recognize();

    return () => {
      effectWasCleanedUp = true;
      window.clearTimeout(timeoutId);
      recognitionController.abort();
      disposeActiveSession();
    };
  }, [state]);

  return {
    state,
    selectLanguage(language: OcrLanguage | "") {
      writeLanguagePreference(STUDY_LANGUAGE_PREFERENCE_KEY, language);
      dispatch({ type: "SELECT_LANGUAGE", language });
    },
    continueToImage() {
      dispatch({ type: "CONTINUE_TO_IMAGE" });
    },
    backToLanguage() {
      dispatch({ type: "BACK_TO_LANGUAGE" });
    },
    selectImage(image: SelectedImage | null) {
      dispatch({ type: "SELECT_IMAGE", image });
    },
    startRecognition() {
      nextAttemptIdRef.current += 1;
      dispatch({
        type: "START_RECOGNITION",
        attemptId: nextAttemptIdRef.current,
      });
    },
    backToImage() {
      dispatch({ type: "BACK_TO_IMAGE" });
    },
    editRecognizedText(text: string) {
      dispatch({ type: "EDIT_RECOGNIZED_TEXT", text });
    },
  };
}
