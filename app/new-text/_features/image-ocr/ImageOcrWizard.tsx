"use client";

import { useEffect, useRef, useState } from "react";
import ImageOcrStep from "./ImageOcrStep";
import ImagePicker, { type SelectedImage } from "./ImagePicker";
import LanguageSelectionStep from "./LanguageSelectionStep";
import RecognitionResultStep from "./RecognitionResultStep";
import { createCroppedImageBlob } from "./cropImage";
import {
  createOcrSession,
  resultToText,
  type OcrSession,
} from "./paddleOcr";
import type { OcrLanguage } from "./ocrLanguages";
import styles from "./imageOcr.module.scss";

type WizardStep = "image" | "language" | "result";

const STEP_NUMBER: Record<WizardStep, number> = {
  image: 1,
  language: 2,
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
  void sessionPromise
    .then((session) => session.dispose())
    .catch(() => {});
}

export default function ImageOcrWizard({
  text,
  onComplete,
}: ImageOcrWizardProps) {
  const [step, setStep] = useState<WizardStep>("image");
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<OcrLanguage | "">("");
  const [recognizedText, setRecognizedText] = useState("");
  const [recognitionError, setRecognitionError] = useState("");
  const [isRecognizing, setIsRecognizing] = useState(false);
  const activeSessionRef = useRef<Promise<OcrSession> | null>(null);
  const isMountedRef = useRef(true);
  const previewUrl = selectedImage?.previewUrl;

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
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

    let sessionPromise: Promise<OcrSession> | null = null;

    try {
      const image = await createCroppedImageBlob(selectedImage);
      if (!isMountedRef.current) return;

      sessionPromise = createOcrSession(selectedLanguage);
      activeSessionRef.current = sessionPromise;
      const session = await sessionPromise;
      if (!isMountedRef.current) return;

      const result = await session.recognize(image);
      if (!isMountedRef.current) return;

      setRecognizedText(resultToText(result));
      setStep("result");
    } catch (error) {
      if (isMountedRef.current) {
        setRecognitionError(getRecognitionError(error));
      }
    } finally {
      if (sessionPromise && activeSessionRef.current === sessionPromise) {
        activeSessionRef.current = null;
        disposeSession(sessionPromise);
      }
      if (isMountedRef.current) setIsRecognizing(false);
    }
  }

  if (step === "image") {
    return (
      <ImageOcrStep
        currentStep={STEP_NUMBER.image}
        totalSteps={3}
        primaryLabel="Continue"
        primaryDisabled={!selectedImage}
        onPrimary={() => setStep("language")}
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
        primaryLabel={isRecognizing ? "Recognizing…" : "Recognize text"}
        primaryDisabled={!selectedLanguage || isRecognizing}
        onBack={() => setStep("image")}
        onPrimary={() => void recognizeSelectedImage()}
      >
        <LanguageSelectionStep
          value={selectedLanguage}
          onChange={setSelectedLanguage}
        />
        {recognitionError && (
          <p className="mt-3 text-danger text-sm" role="alert">
            {recognitionError}
          </p>
        )}
      </ImageOcrStep>
    );
  }

  return (
    <ImageOcrStep
      currentStep={STEP_NUMBER.result}
      totalSteps={3}
      footer={(
        <footer className={styles.resultNavigation}>
          <button
            type="button"
            className="button px-5 py-3"
            onClick={() => setStep("language")}
          >
            Back
          </button>
          {text.trim() && (
            <button
              type="button"
              className="button px-5 py-3"
              disabled={!recognizedText.trim()}
              onClick={() => onComplete(appendRecognizedText(text, recognizedText))}
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
      )}
    >
      <RecognitionResultStep
        value={recognizedText}
        onChange={setRecognizedText}
      />
    </ImageOcrStep>
  );
}

