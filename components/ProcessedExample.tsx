"use client";

import { useState } from "react";
import Image from "next/image";
import { parseExplanationItems } from "@/lib/adaptation";
import Fragment from "./Fragment";
import TextContainer from "./TextContainer";
import styles from "./processedExample.module.scss";

type ResultItem = {
  text?: string;
  translation: string;
  explanation: string | Record<string, string> | Array<{ term: string; meaning: string }>;
};

type ProcessedExampleProps = {
  original: string;
  result: ResultItem[];
};

function getExplanationItems(explanation: ResultItem["explanation"]) {
  if (typeof explanation === "string") {
    return parseExplanationItems(explanation);
  }

  return Array.isArray(explanation)
    ? explanation
    : Object.entries(explanation).map(([term, meaning]) => ({ term, meaning }));
}

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
          text={item.text ?? sentences[index] ?? ""}
          translation={item.translation}
          explanation={
            <div className={styles.explanation}>
              {getExplanationItems(item.explanation).map(
                ({ term, meaning }, explanationIndex) => (
                  <p key={`${term}-${explanationIndex}`}>
                    {term ? (
                      <>
                        <strong>{term}</strong> — {meaning}
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
