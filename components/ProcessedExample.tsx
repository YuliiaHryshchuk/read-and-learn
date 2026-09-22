"use client";

import { useState } from "react";
import Image from "next/image";
import Fragment from "./Fragment";
import TextContainer from "./TextContainer";
import styles from "./processedExample.module.scss";

type ResultItem = {
  translation: string;
  explanation: Record<string, string>;
};

type ProcessedExampleProps = {
  original: string;
  result: ResultItem[];
};

export default function ProcessedExample({ original, result }: ProcessedExampleProps) {
  const [openFragments, setOpenFragments] = useState<Set<number>>(() => new Set([0]));

  // The six example results correspond to the six sentences in the original.
  const sentences = original
    .replace(/\s+/g, " ")
    .trim()
    .match(/[^.!?]+[.!?]+/g)
    ?.map((sentence) => sentence.trim()) ?? [];

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
      className={styles.processedCard}
      contentClassName={styles.fragmentList}
      icon={<Image src="/icons/document.svg" width={22} height={22} alt="" />}
      title="Processed text"
      description="The text is divided into fragments — translate and study them one at a time."
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
    >
      {result.map((item, index) => (
        <Fragment
          key={index}
          number={index + 1}
          text={sentences[index] ?? ""}
          translation={item.translation}
          explanation={
            <div className={styles.explanation}>
              {Object.entries(item.explanation).map(([term, meaning]) => (
                <p key={term}>
                  <strong>{term}</strong> — {meaning}
                </p>
              ))}
            </div>
          }
          isOpen={openFragments.has(index)}
          onOpenChange={(isOpen) => setFragmentOpen(index, isOpen)}
        />
      ))}
    </TextContainer>
  );
}
