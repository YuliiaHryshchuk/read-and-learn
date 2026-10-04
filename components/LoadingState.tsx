import styles from "./loadingState.module.scss";

export default function LoadingState() {
  return (
    <div
      className={`${styles.loading} d-grid place-items-center width-100 text-muted`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <p>Loading…</p>
    </div>
  );
}
