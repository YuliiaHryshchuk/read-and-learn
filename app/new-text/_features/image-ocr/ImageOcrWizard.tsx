"use client";

import { useEffect, useState } from "react";
import ImageOcrStep from "./ImageOcrStep";
import ImagePicker, { type SelectedImage } from "./ImagePicker";
import LanguageSelectionStep from "./LanguageSelectionStep";
import RecognitionResultStep from "./RecognitionResultStep";
import type { TesseractLanguage } from "./tesseractRuntime";
import useImageRecognition from "./useImageRecognition";
import styles from "./imageOcr.module.scss";

type WizardStep = "image" | "language" | "result";

const STEP_NUMBER: Record<WizardStep, number> = {
  image: 1,
  language: 2,
  result: 3,
};

type ImageOcrWizardProps = {
  currentText: string;
  maxCharacters: number;
  onTextChange: (text: string) => void;
  onClose: () => void;
};

export default function ImageOcrWizard({
  currentText,
  maxCharacters,
  onTextChange,
  onClose,
}: ImageOcrWizardProps) {
  const [step, setStep] = useState<WizardStep>("image");
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<TesseractLanguage | "">("");
  const [actionError, setActionError] = useState("");
  const { state, recognize, cancel, setRecognizedText } = useImageRecognition();

  useEffect(() => {
    if (!selectedImage) return;
    return () => URL.revokeObjectURL(selectedImage.previewUrl);
  }, [selectedImage]);

  const startRecognition = () => {
    if (!selectedImage || !selectedLanguage) return;
    setActionError("");
    setStep("result");
    void recognize(selectedImage.file, selectedLanguage);
  };

  const returnToLanguage = () => {
    cancel();
    setActionError("");
    setStep("language");
  };

  const applyRecognizedText = (mode: "replace" | "add") => {
    if (state.status !== "success" || !state.text.trim()) return;

    const nextText = mode === "replace"
      ? state.text
      : currentText
        ? `${currentText}${currentText.endsWith("\n") ? "\n" : "\n\n"}${state.text}`
        : state.text;

    if (nextText.length > maxCharacters) {
      setActionError(
        `The resulting text is too long. The limit is ${maxCharacters} characters.`,
      );
      return;
    }

    onTextChange(nextText);
    onClose();
  };

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
        primaryLabel="Recognize text"
        primaryDisabled={!selectedLanguage}
        onBack={() => setStep("image")}
        onPrimary={startRecognition}
      >
        <LanguageSelectionStep
          value={selectedLanguage}
          onChange={setSelectedLanguage}
        />
      </ImageOcrStep>
    );
  }

  const resultFooter = state.status === "recognizing" || state.status === "idle"
    ? undefined
    : state.status === "success"
      ? (
          <footer className={`${styles.stepNavigation} ${styles.resultNavigation}`}>
            <button
              type="button"
              className={`${styles.secondaryButton} ${styles.backButton} button px-4 py-3`}
              onClick={returnToLanguage}
            >
              Back
            </button>
            {currentText.trim() ? (
              <>
                <button
                  type="button"
                  className={`${styles.secondaryButton} button px-4 py-3`}
                  disabled={!state.text.trim()}
                  onClick={() => applyRecognizedText("replace")}
                >
                  Replace current text
                </button>
                <button
                  type="button"
                  className="button button-primary px-4 py-3"
                  disabled={!state.text.trim()}
                  onClick={() => applyRecognizedText("add")}
                >
                  Add to current text
                </button>
              </>
            ) : (
              <button
                type="button"
                className="button button-primary px-4 py-3"
                disabled={!state.text.trim()}
                onClick={() => applyRecognizedText("replace")}
              >
                Use this text
              </button>
            )}
          </footer>
        )
      : (
          <footer className={`${styles.stepNavigation} ${styles.resultNavigation}`}>
            <button
              type="button"
              className={`${styles.secondaryButton} ${styles.backButton} button px-4 py-3`}
              onClick={returnToLanguage}
            >
              Back
            </button>
            <button
              type="button"
              className="button button-primary px-4 py-3"
              onClick={startRecognition}
            >
              Try again
            </button>
          </footer>
        );

  if (state.status === "idle") return null;

  return (
    <ImageOcrStep
      currentStep={STEP_NUMBER.result}
      totalSteps={3}
      footer={resultFooter}
    >
      <RecognitionResultStep
        state={state}
        actionError={actionError}
        onCancel={returnToLanguage}
        onTextChange={(text) => {
          setActionError("");
          setRecognizedText(text);
        }}
      />
    </ImageOcrStep>
  );
}

