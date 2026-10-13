"use client";

import ImageOcrStep from "./ImageOcrStep";
import ImagePicker from "./ImagePicker";
import LanguageSelectionStep from "./LanguageSelectionStep";
import RecognitionErrorStep from "./RecognitionErrorStep";
import RecognitionResultStep from "./RecognitionResultStep";
import RecognizingStep from "./RecognizingStep";
import useImageOcrFlow from "./useImageOcrFlow";
import styles from "./imageOcr.module.scss";

const STEP_NUMBER = {
  language: 1,
  image: 2,
  recognizing: 3,
  error: 3,
  review: 3,
};

type ImageOcrWizardProps = {
  text: string;
  onComplete: (text: string) => void;
};

function appendRecognizedText(text: string, recognizedText: string) {
  if (!text.trim()) return recognizedText;
  return `${text.trimEnd()}\n\n${recognizedText.trimStart()}`;
}

export default function ImageOcrWizard({
  text,
  onComplete,
}: ImageOcrWizardProps) {
  const flow = useImageOcrFlow();
  const { state } = flow;

  if (state.status === "language") {
    return (
      <ImageOcrStep
        currentStep={STEP_NUMBER.language}
        totalSteps={3}
        primaryLabel="Continue"
        primaryDisabled={!state.selectedLanguage}
        onPrimary={flow.continueToImage}
      >
        <LanguageSelectionStep
          value={state.selectedLanguage}
          onChange={flow.selectLanguage}
        />
      </ImageOcrStep>
    );
  }

  if (state.status === "image") {
    return (
      <ImageOcrStep
        currentStep={STEP_NUMBER.image}
        totalSteps={3}
        primaryLabel="Recognize text"
        primaryDisabled={!state.selectedImage}
        onBack={flow.backToLanguage}
        onPrimary={flow.startRecognition}
      >
        <ImagePicker
          selectedImage={state.selectedImage}
          onSelectedImageChange={flow.selectImage}
        />
      </ImageOcrStep>
    );
  }

  if (state.status === "recognizing") {
    return (
      <ImageOcrStep currentStep={STEP_NUMBER.recognizing} totalSteps={3}>
        <RecognizingStep />
      </ImageOcrStep>
    );
  }

  if (state.status === "error") {
    return (
      <ImageOcrStep
        currentStep={STEP_NUMBER.error}
        totalSteps={3}
        primaryLabel="Back to image"
        onPrimary={flow.backToImage}
      >
        <RecognitionErrorStep message={state.message} />
      </ImageOcrStep>
    );
  }

  return (
    <ImageOcrStep
      currentStep={STEP_NUMBER.review}
      totalSteps={3}
      footer={
        <footer className={styles.resultNavigation}>
          <button
            type="button"
            className="button px-5 py-3"
            onClick={flow.backToImage}
          >
            Back
          </button>
          {text.trim() && (
            <button
              type="button"
              className="button px-5 py-3"
              disabled={!state.recognizedText.trim()}
              onClick={() =>
                onComplete(appendRecognizedText(text, state.recognizedText))
              }
            >
              Add to text
            </button>
          )}
          <button
            type="button"
            className="button button-primary px-5 py-3"
            disabled={!state.recognizedText.trim()}
            onClick={() => onComplete(state.recognizedText)}
          >
            {text.trim() ? "Replace text" : "Use text"}
          </button>
        </footer>
      }
    >
      <RecognitionResultStep
        value={state.recognizedText}
        onChange={flow.editRecognizedText}
      />
    </ImageOcrStep>
  );
}
