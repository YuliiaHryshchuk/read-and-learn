"use client";

import { useEffect, useState } from "react";
import ImageOcrStep from "./ImageOcrStep";
import ImagePicker, { type SelectedImage } from "./ImagePicker";
import LanguageSelectionStep from "./LanguageSelectionStep";
import type { OcrLanguage } from "./ocrLanguages";

type WizardStep = "image" | "language";

const STEP_NUMBER: Record<WizardStep, number> = {
  image: 1,
  language: 2,
};

export default function ImageOcrWizard() {
  const [step, setStep] = useState<WizardStep>("image");
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<OcrLanguage | "">("");

  useEffect(() => {
    if (!selectedImage) return;
    return () => URL.revokeObjectURL(selectedImage.previewUrl);
  }, [selectedImage]);

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
        primaryDisabled
        onBack={() => setStep("image")}
        onPrimary={() => {}}
      >
        <LanguageSelectionStep
          value={selectedLanguage}
          onChange={setSelectedLanguage}
        />
      </ImageOcrStep>
    );
  }
}

