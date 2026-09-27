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
      className={`${styles.fragment} d-flex gap-4 width-100 min-width-0 p-3 mobile-gap-2 mobile-p-2`}
      aria-label={`Fragment ${number}`}
    >
      <span
        className={`${styles.number} d-grid place-items-center flex-none size-6 text-body font-bold mobile-size-5`}
        aria-hidden="true"
      >
        {number}
      </span>
      <div className="min-width-0 flex-1">
        <div className="d-flex align-items-center gap-3 min-width-0 min-height-6">
          {isOpen ? (
            <p className={`${styles.text} min-width-0 flex-1 m-0 py-2 text-lg line-body mobile-text-md`}>
              {text}
            </p>
          ) : (
            <button
              className={`${styles.previewButton} d-block flex-1 min-width-0 overflow-hidden py-2 text-md line-compact text-left white-space-nowrap text-ellipsis cursor-pointer`}
              type="button"
              aria-label={`Expand fragment ${number}: ${text}`}
              onClick={() => onOpenChange(true)}
            >
              {text}
            </button>
          )}
          <button
            className={`${styles.collapseButton} d-grid place-items-center flex-none size-6 p-0 cursor-pointer`}
            type="button"
            aria-label={isOpen ? `Collapse fragment ${number}` : `Expand fragment ${number}`}
            aria-expanded={isOpen}
            aria-controls={`${id}-content`}
            onClick={() => onOpenChange(!isOpen)}
          >
            <Image
              className={`${isOpen ? styles.chevronUp : ""} size-5`}
              src="/icons/chevron-down.svg"
              width={20}
              height={20}
              alt=""
            />
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
              contentClassName={`${styles.explanationContent} overflow-y-auto text-default text-body line-body`}
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
