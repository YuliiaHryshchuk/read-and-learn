"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import TextContainer from "@/components/TextContainer";
import type { NewTextMode } from "../_hooks/useMaterialEditor";
import styles from "../page.module.scss";

type SourceTextEditorProps = {
  mode: NewTextMode;
  materialTitle?: string;
  text: string;
  wordCount: number;
  maxWords: number;
  maxCharacters: number;
  isOverWordLimit: boolean;
  disabled: boolean;
  onChange: (text: string) => void;
};

export default function SourceTextEditor({
  mode,
  materialTitle,
  text,
  wordCount,
  maxWords,
  maxCharacters,
  isOverWordLimit,
  disabled,
  onChange,
}: SourceTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasAppliedInitialFocus = useRef(false);

  useEffect(() => {
    if (disabled || hasAppliedInitialFocus.current) return;

    hasAppliedInitialFocus.current = true;
    if (!window.matchMedia("(max-width: 719.98px)").matches) return;

    textareaRef.current?.focus({ preventScroll: true });
  }, [disabled]);

  return (
    <TextContainer
      className={styles.editorCard}
      icon={<Image src="/icons/document.svg" width={22} height={22} alt="" />}
      title={
        <label htmlFor="source-text">
          {mode === "edit" && materialTitle
            ? `Edit “${materialTitle}”`
            : mode === "edit"
              ? "Edit text"
              : "Type your text"}
        </label>
      }
      contentClassName={`${styles.inputContainer} min-height-0 p-0 overflow-hidden`}
      actions={[
        <span
          id="text-limits"
          className={`${isOverWordLimit ? "text-danger" : "text-muted"} text-md mobile-text-xs`}
          key="limits"
          role="status"
        >
          {wordCount}/{maxWords} words
        </span>,
      ]}
    >
      <textarea
        ref={textareaRef}
        id="source-text"
        name="sourceText"
        className={`${styles.textarea} d-block width-100 p-4 text-xl line-body`}
        aria-describedby="text-limits"
        maxLength={maxCharacters}
        value={text}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </TextContainer>
  );
}
