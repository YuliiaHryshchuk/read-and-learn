"use client";

import { useState } from "react";
import Image from "next/image";
import {
  parseExplanationItems,
  type AdaptedFragment,
} from "@/lib/adaptation";
import Fragment from "./Fragment";
import TextContainer from "./TextContainer";
import styles from "./processedExample.module.scss";

type ProcessedExampleProps = {
  result: readonly AdaptedFragment[];
  initiallyOpenFirstFragment?: boolean;
  className?: string;
};

export default function ProcessedExample({
  result,
  initiallyOpenFirstFragment = true,
  className = "mt-5",
}: ProcessedExampleProps) {
  const [openFragments, setOpenFragments] = useState<Set<number>>(
    () => new Set(initiallyOpenFirstFragment ? [0] : []),
  );
  const areAllFragmentsOpen = result.length > 0
    && result.every((_, index) => openFragments.has(index));

  function setFragmentOpen(index: number, isOpen: boolean) {
    setOpenFragments((current) => {
      const next = new Set(current);
      if (isOpen) next.add(index);
      else next.delete(index);
      return next;
    });
  }

  return (
    <TextContainer
      className={`${className} min-width-0`}
      contentClassName="d-grid gap-2 min-width-0 min-height-0 p-0 bg-transparent"
      mobileHeaderLayout="flow"
      icon={<Image src="/icons/document.svg" width={22} height={22} alt="" />}
      title="Processed text"
      description={
        <>
          <span className={styles.desktopDescription}>
            The text is divided into fragments — translate and study them one at a time.
          </span>
          <span className={styles.mobileDescription}>
            Open a fragment to see its translation and explanation.
          </span>
        </>
      }
      actions={[
        <button key="collapse-all" type="button" onClick={() => setOpenFragments(new Set())}>
          Collapse all
        </button>,
        <button
          key="expand-all"
          type="button"
          onClick={() => setOpenFragments(new Set(result.map((_, index) => index)))}
        >
          Expand all
        </button>,
      ]}
      mobileActions={[
        <button
          className="d-inline-flex align-items-center gap-2"
          key="toggle-all"
          type="button"
          onClick={() => setOpenFragments(
            areAllFragmentsOpen
              ? new Set()
              : new Set(result.map((_, index) => index)),
          )}
        >
          <Image
            className={`${styles.bulkToggleIcon} ${areAllFragmentsOpen ? styles.bulkToggleIconOpen : ""}`}
            src="/icons/chevron-down.svg"
            width={16}
            height={16}
            alt=""
          />
          {areAllFragmentsOpen ? "Collapse all" : "Expand all"}
        </button>,
      ]}
    >
      {result.map((item, index) => (
        <Fragment
          key={item.id}
          number={index + 1}
          text={item.text}
          translation={item.translation}
          explanation={
            <div>
              {parseExplanationItems(item.explanation).map(
                ({ term, meaning }, explanationIndex) => (
                  <p key={`${term}-${explanationIndex}`}>
                    {term ? (
                      <>
                        <strong className="text-strong">{term}</strong> — {meaning}
                      </>
                    ) : (
                      meaning
                    )}
                  </p>
                ),
              )}
            </div>
          }
          isOpen={openFragments.has(index)}
          onOpenChange={(isOpen) => setFragmentOpen(index, isOpen)}
        />
      ))}
    </TextContainer>
  );
}
