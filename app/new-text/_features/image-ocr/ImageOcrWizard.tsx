"use client";

import { useEffect, useRef, useState } from "react";
import {
  readLanguagePreference,
  STUDY_LANGUAGE_PREFERENCE_KEY,
  writeLanguagePreference,
} from "@/lib/languagePreferences";
import ImageOcrStep from "./ImageOcrStep";
import ImagePicker, { type SelectedImage } from "./ImagePicker";
import LanguageSelectionStep from "./LanguageSelectionStep";
import RecognitionResultStep from "./RecognitionResultStep";
import { createCroppedImageBlob } from "./cropImage";
import { createOcrSession, resultToText, type OcrSession } from "./paddleOcr";
import { isOcrLanguage, type OcrLanguage } from "./ocrLanguages";
import styles from "./imageOcr.module.scss";

type WizardStep = "image" | "language" | "result";

const RECOGNITION_TIMEOUT_MS = 120_000;

class RecognitionTimeoutError extends Error {
  constructor() {
    super(
      "Text recognition took too long. This browser may not support local recognition. Try another browser or image.",
    );
    this.name = "RecognitionTimeoutError";
  }
}

const STEP_NUMBER: Record<WizardStep, number> = {
  language: 1,
  image: 2,
  result: 3,
};

type ImageOcrWizardProps = {
  text: string;
  onComplete: (text: string) => void;
};

function appendRecognizedText(text: string, recognizedText: string) {
  if (!text.trim()) return recognizedText;
  return `${text.trimEnd()}\n\n${recognizedText.trimStart()}`;
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

export default function ImageOcrWizard({
  text,
  onComplete,
}: ImageOcrWizardProps) {
  const [step, setStep] = useState<WizardStep>("language");
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(
    null,
  );
  const [selectedLanguage, setSelectedLanguage] = useState<OcrLanguage | "">(
    getPreferredStudyLanguage,
  );
  const [recognizedText, setRecognizedText] = useState("");
  const [recognitionError, setRecognitionError] = useState("");
  const [isRecognizing, setIsRecognizing] = useState(false);
  const activeSessionRef = useRef<Promise<OcrSession> | null>(null);
  const activeRecognitionRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);
  const previewUrl = selectedImage?.previewUrl;

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      activeRecognitionRef.current?.abort();
      activeRecognitionRef.current = null;
      const activeSession = activeSessionRef.current;
      activeSessionRef.current = null;
      if (activeSession) disposeSession(activeSession);
    };
  }, []);

  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  async function recognizeSelectedImage() {
    if (!selectedImage || !selectedLanguage || isRecognizing) return;

    setIsRecognizing(true);
    setRecognitionError("");
    setStep("result");

    const recognitionController = new AbortController();
    activeRecognitionRef.current = recognitionController;
    const timeoutId = window.setTimeout(() => {
      recognitionController.abort(new RecognitionTimeoutError());
    }, RECOGNITION_TIMEOUT_MS);
    let sessionPromise: Promise<OcrSession> | null = null;

    try {
      const recognition = (async () => {
        const image = await createCroppedImageBlob(selectedImage);
        if (!isMountedRef.current) return null;

        sessionPromise = createOcrSession(selectedLanguage);
        activeSessionRef.current = sessionPromise;
        const session = await sessionPromise;
        if (!isMountedRef.current) return null;

        return session.recognize(image);
      })();
      const result = await raceWithAbort(
        recognition,
        recognitionController.signal,
      );
      if (!isMountedRef.current) return;
      if (!result) return;

      setRecognizedText(resultToText(result));
      setStep("result");
    } catch (error) {
      if (isMountedRef.current) {
        setRecognitionError(getRecognitionError(error));
      }
    } finally {
      window.clearTimeout(timeoutId);
      if (activeRecognitionRef.current === recognitionController) {
        activeRecognitionRef.current = null;
      }
      if (sessionPromise && activeSessionRef.current === sessionPromise) {
        activeSessionRef.current = null;
        disposeSession(sessionPromise);
      }
      if (isMountedRef.current) setIsRecognizing(false);
    }
  }

  function selectLanguage(language: OcrLanguage | "") {
    setSelectedLanguage(language);
    writeLanguagePreference(STUDY_LANGUAGE_PREFERENCE_KEY, language);
  }

  if (step === "image") {
    return (
      <ImageOcrStep
        currentStep={STEP_NUMBER.image}
        totalSteps={3}
        primaryLabel={isRecognizing ? "Recognizing…" : "Recognize text"}
        primaryDisabled={!selectedImage || isRecognizing}
        onBack={() => setStep("language")}
        onPrimary={() => void recognizeSelectedImage()}
      >
        <ImagePicker
          selectedImage={selectedImage}
          onSelectedImageChange={setSelectedImage}
        />
      </ImageOcrStep>
    );
  }

  if (step === "language") {
    return (
      <ImageOcrStep
        currentStep={STEP_NUMBER.language}
        totalSteps={3}
        primaryLabel="Continue"
        primaryDisabled={!selectedLanguage}
        onPrimary={() => setStep("image")}
      >
        <LanguageSelectionStep
          value={selectedLanguage}
          onChange={selectLanguage}
        />
      </ImageOcrStep>
    );
  }

  if (isRecognizing) {
    return (
      <ImageOcrStep currentStep={STEP_NUMBER.result} totalSteps={3}>
        <section
          className={styles.recognitionStatus}
          aria-live="polite"
          aria-busy="true"
          role="status"
        >
          <h3
            className="text-lg font-semibold line-heading"
            aria-label="Recognizing…"
          >
            <span aria-hidden="true">
              Recognizing
              <span className={styles.recognitionDotsSlot}>
                <span>.</span>
                <span className={styles.recognitionDotTwo}>.</span>
                <span className={styles.recognitionDotThree}>.</span>
              </span>
            </span>
          </h3>
          <p className="mt-2 text-muted text-md line-body">
            This may take up to two minutes
          </p>
        </section>
      </ImageOcrStep>
    );
  }

  if (recognitionError) {
    return (
      <ImageOcrStep
        currentStep={STEP_NUMBER.result}
        totalSteps={3}
        primaryLabel="Back to image"
        onPrimary={() => setStep("image")}
      >
        <section className={styles.recognitionStatus} role="alert">
          <h3 className="text-lg font-semibold line-heading">
            Text could not be recognized
          </h3>
          <p className="mt-2 text-danger text-md line-body">
            {recognitionError}
          </p>
        </section>
      </ImageOcrStep>
    );
  }

  return (
    <ImageOcrStep
      currentStep={STEP_NUMBER.result}
      totalSteps={3}
      footer={
        <footer className={styles.resultNavigation}>
          <button
            type="button"
            className="button px-5 py-3"
            onClick={() => setStep("image")}
          >
            Back
          </button>
          {text.trim() && (
            <button
              type="button"
              className="button px-5 py-3"
              disabled={!recognizedText.trim()}
              onClick={() =>
                onComplete(appendRecognizedText(text, recognizedText))
              }
            >
              Add to text
            </button>
          )}
          <button
            type="button"
            className="button button-primary px-5 py-3"
            disabled={!recognizedText.trim()}
            onClick={() => onComplete(recognizedText)}
          >
            {text.trim() ? "Replace text" : "Use text"}
          </button>
        </footer>
      }
    >
      <RecognitionResultStep
        value={recognizedText}
        onChange={setRecognizedText}
      />
    </ImageOcrStep>
  );
}
