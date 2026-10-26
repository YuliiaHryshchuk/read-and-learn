"use client";

import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import LoadingState from "@/components/LoadingState";
import ProcessedExample from "@/components/ProcessedExample";
import { isAdaptationOutdated } from "@/lib/incrementalAdaptation";
import { countWords } from "@/lib/text";
import { useTextStore } from "@/stores/useTextStore";
import GenerationControls from "./GenerationControls";
import LanguageSelector from "./LanguageSelector";
import SaveToLibrary from "./SaveToLibrary";
import SourceTextEditor from "./SourceTextEditor";
import {
  MAX_TEXT_CHARACTERS,
  MAX_TEXT_WORDS,
  useAdaptationGeneration,
} from "../_hooks/useAdaptationGeneration";
import {
  useMaterialEditor,
  type NewTextMode,
} from "../_hooks/useMaterialEditor";
import styles from "../page.module.scss";

type NewTextFormProps = {
  mode: NewTextMode;
};

export default function NewTextForm({ mode }: NewTextFormProps) {
  const text = useTextStore((state) => state.text);
  const setText = useTextStore((state) => state.setText);
  const result = useTextStore((state) => state.result);
  const clearAll = useTextStore((state) => state.clearAll);
  const targetLanguage = useTextStore((state) => state.targetLanguage);
  const resultLanguage = useTextStore((state) => state.resultLanguage);
  const setTargetLanguage = useTextStore((state) => state.setTargetLanguage);
  const editingMaterial = useTextStore((state) => state.editingMaterial);
  const hasHydrated = useTextStore((state) => state.hasHydrated);
  const { isLoadingSavedMaterial, materialMessage } = useMaterialEditor(mode);
  const wordCount = countWords(text);
  const isOverWordLimit = wordCount > MAX_TEXT_WORDS;
  const effectiveTargetLanguage = targetLanguage.trim();
  const isExplanationOutdated = useMemo(
    () => result ? isAdaptationOutdated(text, result) : false,
    [result, text],
  );
  const {
    clearGenerationMessage,
    generate,
    generationMessage,
    isPending,
  } = useAdaptationGeneration({
    text,
    result,
    targetLanguage,
    resultLanguage,
    hasHydrated,
    isLoadingSavedMaterial,
    isOverWordLimit,
  });
  const controlsDisabled = isPending || isLoadingSavedMaterial;
  const generationDisabled = controlsDisabled
    || !hasHydrated
    || !effectiveTargetLanguage
    || isOverWordLimit;
  const message = generationMessage ?? materialMessage;

  if (isLoadingSavedMaterial) return <LoadingState />;

  return (
    <div className={styles.form}>
      <div className={styles.editorViewport}>
        {mode === "edit" && (
          <Link
            className={`${styles.backLink} ${styles.backButton} mb-4 text-sm`}
            href="/library"
          >
            <Image
              className={styles.backChevron}
              src="/icons/chevron-down.svg"
              width={16}
              height={16}
              alt=""
            />
            <span>My library</span>
          </Link>
        )}

        <SourceTextEditor
          mode={mode}
          materialTitle={editingMaterial?.title}
          text={text}
          wordCount={wordCount}
          maxWords={MAX_TEXT_WORDS}
          maxCharacters={MAX_TEXT_CHARACTERS}
          isOverWordLimit={isOverWordLimit}
          disabled={!hasHydrated || controlsDisabled}
          onChange={setText}
          clearAllDisabled={
            !hasHydrated || controlsDisabled || (!text && !result)
          }
          onClearAll={mode === "create"
            ? () => {
                clearAll();
                clearGenerationMessage();
              }
            : undefined}
        />

        <div className="d-flex align-items-center justify-content-between gap-5 mt-7 mobile-flex-column mobile-align-items-stretch mobile-gap-4">
          <LanguageSelector
            value={targetLanguage}
            disabled={controlsDisabled}
            onChange={setTargetLanguage}
          />
          <GenerationControls
            hasResult={Boolean(result)}
            disabled={generationDisabled}
            isLoadingSavedMaterial={isLoadingSavedMaterial}
            isPending={isPending}
            onGenerate={(forceRegenerate) => void generate(forceRegenerate)}
          />
        </div>

        <p
          className={`${styles.formMessage} mt-3 text-muted text-md text-right`}
          role="status"
        >
          {message}
        </p>
      </div>

      {result && (
        <>
          {isExplanationOutdated && (
            <p className="mt-5 text-muted text-sm line-compact" role="status">
              *Explanation is outdated
            </p>
          )}
          <ProcessedExample
            key={`${result.sourceText}:${resultLanguage ?? "unknown"}`}
            className={isExplanationOutdated ? "mt-2" : undefined}
            result={result.fragments}
          />
          {result.sourceText === text
            && resultLanguage === effectiveTargetLanguage
            && <SaveToLibrary />}
        </>
      )}
    </div>
  );
}
