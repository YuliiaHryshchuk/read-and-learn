import styles from "./imageOcr.module.scss";

type RecognitionResultStepProps = {
  value: string;
  onChange: (value: string) => void;
};

export default function RecognitionResultStep({
  value,
  onChange,
}: RecognitionResultStepProps) {
  return (
    <section className={styles.resultStep} aria-labelledby="ocr-result-title">
      <h3 id="ocr-result-title" className="text-lg font-semibold line-heading">
        Review recognized text
      </h3>
      <p className="mt-2 text-muted text-md line-body">
        Correct any recognition errors before adding the text.
      </p>
      <label className="visually-hidden" htmlFor="ocr-result-text">
        Recognized text
      </label>
      <textarea
        id="ocr-result-text"
        className={styles.resultTextarea}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </section>
  );
}
