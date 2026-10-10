import styles from "./imageOcr.module.scss";

type RecognitionProgressProps = {
  progress: number;
  label: string;
  onCancel: () => void;
};

export default function RecognitionProgress({
  progress,
  label,
  onCancel,
}: RecognitionProgressProps) {
  const percentage = Math.round(progress * 100);

  return (
    <section className={styles.recognitionState} aria-labelledby="result-step-title">
      <h3 id="result-step-title" className="text-lg font-semibold line-heading">
        Recognizing text
      </h3>
      <div className={styles.progressRingWrapper}>
        <svg
          className={styles.progressRing}
          viewBox="0 0 100 100"
          role="progressbar"
          aria-label="Text recognition progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percentage}
        >
          <circle className={styles.progressTrack} cx="50" cy="50" r="44" />
          <circle
            className={styles.progressValue}
            cx="50"
            cy="50"
            r="44"
            pathLength="100"
            style={{ strokeDashoffset: 100 - percentage }}
          />
        </svg>
        <button
          type="button"
          className={styles.progressCancel}
          aria-label="Cancel recognition"
          onClick={onCancel}
        >
          ×
        </button>
      </div>
      <p className="text-muted text-md line-body" role="status">
        {label}
      </p>
    </section>
  );
}
