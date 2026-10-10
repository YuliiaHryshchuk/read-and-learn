import styles from "./imageOcr.module.scss";
import RecognitionProgress from "./RecognitionProgress";
import type { ImageRecognitionState } from "./useImageRecognition";

type RecognitionResultStepProps = {
  state: Exclude<ImageRecognitionState, { status: "idle" }>;
  actionError?: string;
  onCancel: () => void;
  onTextChange: (text: string) => void;
};

export default function RecognitionResultStep({
  state,
  actionError,
  onCancel,
  onTextChange,
}: RecognitionResultStepProps) {
  if (state.status === "recognizing") {
    return (
      <RecognitionProgress
        progress={state.progress}
        label={state.label}
        onCancel={onCancel}
      />
    );
  }

  if (state.status === "success") {
    return (
      <section className={styles.resultStep} aria-labelledby="result-step-title">
        <label
          id="result-step-title"
          htmlFor="recognized-text"
          className="text-lg font-semibold line-heading"
        >
          Review recognized text
        </label>
        <textarea
          id="recognized-text"
          className={`${styles.resultTextarea} text-md line-body`}
          value={state.text}
          onChange={(event) => onTextChange(event.target.value)}
        />
        {actionError && (
          <p className={`${styles.resultError} text-danger text-sm`} role="alert">
            {actionError}
          </p>
        )}
      </section>
    );
  }

  return (
    <section className={styles.resultMessage} aria-labelledby="result-step-title">
      <h3 id="result-step-title" className="text-lg font-semibold line-heading">
        {state.status === "empty" ? "No text found" : "Recognition failed"}
      </h3>
      <p className="mt-2 text-muted text-md line-body" role="alert">
        {state.status === "empty"
          ? "We couldn't find readable text in this image. Try another image or language."
          : state.message}
      </p>
    </section>
  );
}

