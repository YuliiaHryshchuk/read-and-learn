import styles from "./imageOcr.module.scss";

export default function RecognizingStep() {
  return (
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
  );
}
