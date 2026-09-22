"use client";

import { useId, useState, type ReactNode } from "react";
import Image from "next/image";
import TextContainer from "./TextContainer";
import styles from "./fragment.module.scss";

export type FragmentProps = {
  number: number;
  text: string;
  translation: string;
  explanation: ReactNode;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

export default function Fragment({
  number,
  text,
  translation,
  explanation,
  isOpen,
  onOpenChange,
}: FragmentProps) {
  const [translationOpen, setTranslationOpen] = useState(false);
  const [explanationOpen, setExplanationOpen] = useState(true);
  const id = useId();

  return (
    <article className={styles.fragment} aria-label={`Fragment ${number}`}>
      <span className={styles.number} aria-hidden="true">{number}</span>
      <div className={styles.body}>
        <div className={styles.topRow}>
          {isOpen ? (
            <p className={styles.text}>{text}</p>
          ) : (
            <button
              className={styles.previewButton}
              type="button"
              aria-label={`Expand fragment ${number}: ${text}`}
              onClick={() => onOpenChange(true)}
            >
              {text}
            </button>
          )}
          <button
            className={styles.collapseButton}
            type="button"
            aria-label={isOpen ? `Collapse fragment ${number}` : `Expand fragment ${number}`}
            aria-expanded={isOpen}
            aria-controls={`${id}-content`}
            onClick={() => onOpenChange(!isOpen)}
          >
            <Image
              className={isOpen ? styles.chevronUp : undefined}
              src="/icons/chevron-down.svg"
              width={20}
              height={20}
              alt=""
            />
          </button>
        </div>

        {isOpen && (
          <div id={`${id}-content`} className={styles.expanded}>
            <button
              className={styles.translationButton}
              type="button"
              aria-expanded={translationOpen}
              aria-controls={`${id}-translation`}
              onClick={() => setTranslationOpen((open) => !open)}
            >
              <Image
                src={translationOpen ? "/icons/eye-off.svg" : "/icons/eye.svg"}
                width={18}
                height={18}
                alt=""
              />
              {translationOpen ? "Hide translation" : "Show translation"}
            </button>

            {translationOpen && (
              <p id={`${id}-translation`} className={styles.translation}>
                {translation}
              </p>
            )}

            <TextContainer
              variant="plain"
              className={`${styles.explanationCard} ${translationOpen ? styles.withTranslation : ""}`}
              contentClassName={styles.explanationContent}
              icon={<Image src="/icons/document.svg" width={22} height={22} alt="" />}
              title="Detailed explanation"
              actions={[
                <button
                  key="toggle-explanation"
                  type="button"
                  aria-expanded={explanationOpen}
                  aria-controls={`${id}-explanation`}
                  onClick={() => setExplanationOpen((open) => !open)}
                >
                  {explanationOpen ? "Collapse explanation" : "Expand explanation"}
                </button>,
              ]}
              showContent={explanationOpen}
            >
              <div id={`${id}-explanation`}>{explanation}</div>
            </TextContainer>
          </div>
        )}
      </div>
    </article>
  );
}
