"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  isAdaptationResult,
  type AdaptationResult,
  type StructuredAdaptationResult,
} from "@/lib/adaptation";
import {
  MAX_TARGET_LANGUAGE_LENGTH,
  TARGET_LANGUAGE,
} from "@/lib/languages";

type EditingMaterial = {
  id: string;
  title: string;
};

type TextState = {
  text: string;
  result: AdaptationResult | null;
  targetLanguage: string;
  resultLanguage: string | null;
  editingMaterial: EditingMaterial | null;
  hasHydrated: boolean;
  setText: (text: string) => void;
  setTargetLanguage: (language: string) => void;
  setResult: (result: AdaptationResult, language: string) => void;
  clearResult: () => void;
  startNewText: () => void;
  startEditingMaterial: (material: EditingMaterial & {
    sourceText: string;
    targetLanguage: string;
    adaptation: StructuredAdaptationResult;
  }) => void;
  clearEditingMaterial: () => void;
  finishHydration: () => void;
};

export const useTextStore = create<TextState>()(
  persist(
    (set) => ({
      text: "",
      result: null,
      targetLanguage: TARGET_LANGUAGE,
      resultLanguage: null,
      editingMaterial: null,
      hasHydrated: false,
      setText: (text) => set((state) => ({
        text,
        result: state.result?.kind === "structured" ? state.result : null,
      })),
      setTargetLanguage: (targetLanguage) => set({ targetLanguage }),
      setResult: (result, resultLanguage) => set({ result, resultLanguage }),
      clearResult: () => set({ result: null, resultLanguage: null }),
      startNewText: () => set({
        text: "",
        result: null,
        targetLanguage: TARGET_LANGUAGE,
        resultLanguage: null,
        editingMaterial: null,
      }),
      startEditingMaterial: ({
        id,
        title,
        sourceText,
        targetLanguage,
        adaptation,
      }) => set({
        text: sourceText,
        result: adaptation,
        targetLanguage,
        resultLanguage: targetLanguage,
        editingMaterial: { id, title },
      }),
      clearEditingMaterial: () => set({
        editingMaterial: null,
        targetLanguage: TARGET_LANGUAGE,
        resultLanguage: null,
      }),
      finishHydration: () => set({ hasHydrated: true }),
    }),
    {
      name: "study-reader-new-text",
      version: 7,
      storage: createJSONStorage(() => localStorage),
      // Restore after mount so the server and first browser render match.
      skipHydration: true,
      partialize: ({
        text,
        result,
        targetLanguage,
        resultLanguage,
        editingMaterial,
      }) => editingMaterial
        ? {
            text: "",
            result: null,
            targetLanguage: TARGET_LANGUAGE,
            resultLanguage: null,
            editingMaterial,
          }
        : {
            text,
            result,
            targetLanguage,
            resultLanguage,
            editingMaterial: null,
          },
      migrate: (persisted) => {
        if (!persisted || typeof persisted !== "object") return persisted;
        const saved = persisted as Record<string, unknown>;
        return {
          text: typeof saved.text === "string" ? saved.text : "",
          result: isAdaptationResult(saved.result) ? saved.result : null,
          targetLanguage: parseLanguage(saved.targetLanguage),
          resultLanguage: parseOptionalLanguage(saved.resultLanguage),
          editingMaterial: parseEditingMaterial(saved.editingMaterial),
        };
      },
      merge: (persisted, current) => {
        if (!persisted || typeof persisted !== "object") return current;
        const saved = persisted as Record<string, unknown>;
        return {
          ...current,
          text: typeof saved.text === "string" ? saved.text : "",
          result: isAdaptationResult(saved.result) ? saved.result : null,
          targetLanguage: parseLanguage(saved.targetLanguage),
          resultLanguage: parseOptionalLanguage(saved.resultLanguage),
          editingMaterial: parseEditingMaterial(saved.editingMaterial),
        };
      },
    },
  ),
);

function parseEditingMaterial(value: unknown): EditingMaterial | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.id === "string" && typeof candidate.title === "string"
    ? { id: candidate.id, title: candidate.title }
    : null;
}

function parseLanguage(value: unknown) {
  return typeof value === "string"
    && value.trim()
    && value.length <= MAX_TARGET_LANGUAGE_LENGTH
    ? value
    : TARGET_LANGUAGE;
}

function parseOptionalLanguage(value: unknown) {
  return typeof value === "string"
    && value.trim()
    && value.length <= MAX_TARGET_LANGUAGE_LENGTH
    ? value
    : null;
}
