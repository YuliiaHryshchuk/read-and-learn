import styles from "./imageOcr.module.scss";

type RecognitionErrorStepProps = {
  message: string;
};

export default function RecognitionErrorStep({
  message,
}: RecognitionErrorStepProps) {
  return (
    <section className={styles.recognitionStatus} role="alert">
      <h3 className="text-lg font-semibold line-heading">
        Text could not be recognized
      </h3>
      <p className="mt-2 text-danger text-md line-body">{message}</p>
    </section>
  );
}
