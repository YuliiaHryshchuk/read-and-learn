import type { ReactNode } from "react";
import styles from "./imageOcr.module.scss";

type ImageOcrStepProps = {
  children: ReactNode;
  currentStep: number;
  totalSteps: number;
  footer?: ReactNode;
  primaryLabel?: string;
  primaryDisabled?: boolean;
  onBack?: () => void;
  onPrimary?: () => void;
};

export default function ImageOcrStep({
  children,
  currentStep,
  totalSteps,
  footer,
  primaryLabel,
  primaryDisabled = false,
  onBack,
  onPrimary,
}: ImageOcrStepProps) {
  return (
    <div className={styles.stepShell}>
      <p className={`${styles.stepIndicator} text-muted text-sm`}>
        Step {currentStep} of {totalSteps}
      </p>
      <div className={styles.stepContent}>{children}</div>
      {footer ?? (primaryLabel && onPrimary ? (
        <footer className={styles.stepNavigation}>
          {onBack && (
            <button
              type="button"
              className={`${styles.secondaryButton} button px-5 py-3`}
              onClick={onBack}
            >
              Back
            </button>
          )}
          <button
            type="button"
            className="button button-primary px-5 py-3"
            disabled={primaryDisabled}
            onClick={onPrimary}
          >
            {primaryLabel}
          </button>
        </footer>
      ) : null)}
    </div>
  );
}

