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
    <article
      className={`${styles.fragment} width-100 min-width-0`}
      aria-label={`Fragment ${number}`}
    >
      <div className={styles.fragmentHeader}>
        <button
          className={`${styles.fragmentToggle} ${isOpen ? styles.fragmentToggleOpen : styles.fragmentToggleClosed}`}
          type="button"
          aria-label={isOpen ? `Collapse fragment ${number}` : `Expand fragment ${number}: ${text}`}
          aria-expanded={isOpen}
          aria-controls={`${id}-content`}
          onClick={() => onOpenChange(!isOpen)}
        >
          <span
            className={`${styles.number} text-body font-bold`}
            aria-hidden="true"
          >
            {number}
          </span>
          <Image
            className={`${styles.collapseButton} ${isOpen ? styles.chevronUp : ""} size-5`}
            src="/icons/chevron-down.svg"
            width={20}
            height={20}
            alt=""
          />
          {isOpen ? (
            <span className={`${styles.text} min-width-0 text-lg line-body mobile-text-md`}>
              {text}
            </span>
          ) : (
            <span className={`${styles.previewButton} min-width-0 overflow-hidden text-md line-compact text-left white-space-nowrap text-ellipsis`}>
              {text}
            </span>
          )}
        </button>
      </div>

      {isOpen && (
        <div
          id={`${id}-content`}
          className={`${styles.expanded} d-grid gap-2 min-width-0 mt-2`}
        >
            <button
              className={`${styles.translationButton} width-fit-content d-inline-flex align-items-center gap-2 py-2 px-3 text-sm cursor-pointer`}
              type="button"
              aria-expanded={translationOpen}
              aria-controls={`${id}-translation`}
              onClick={() => setTranslationOpen((open) => !open)}
            >
              <Image
                className="size-4"
                src={translationOpen ? "/icons/eye-off.svg" : "/icons/eye.svg"}
                width={18}
                height={18}
                alt=""
              />
              {translationOpen ? "Hide translation" : "Show translation"}
            </button>

            {translationOpen && (
              <p
                id={`${id}-translation`}
                className={`${styles.translation} min-width-0 m-0 p-2 text-lg line-body mobile-text-md`}
              >
                {translation}
              </p>
            )}

            <TextContainer
              variant="plain"
              className={`${styles.explanationCard} min-width-0 mt-1 pt-3 ${translationOpen ? styles.withTranslation : ""}`}
              contentClassName={`${styles.explanationContent} ${explanationOpen ? "" : styles.explanationContentCollapsed} overflow-y-auto text-default text-body line-body`}
              hideIconOnMobile
              icon={<Image src="/icons/document.svg" width={22} height={22} alt="" />}
              title={
                <>
                  <span className={styles.desktopExplanationTitle}>Detailed explanation</span>
                  <span className={styles.mobileExplanationTitle}>Explanation</span>
                </>
              }
              actions={[
                <button
                  className={styles.explanationToggle}
                  key="toggle-explanation"
                  type="button"
                  aria-expanded={explanationOpen}
                  aria-controls={`${id}-explanation`}
                  onClick={() => setExplanationOpen((open) => !open)}
                >
                  {explanationOpen ? "Collapse explanation" : "Expand explanation"}
                </button>,
              ]}
            >
              <div id={`${id}-explanation`}>{explanation}</div>
            </TextContainer>
        </div>
      )}
    </article>
  );
}
