"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  isAdaptationResult,
  type AdaptationResult,
  type StructuredAdaptationResult,
} from "@/lib/adaptation";

type EditingMaterial = {
  id: string;
  title: string;
};

type TextState = {
  text: string;
  result: AdaptationResult | null;
  editingMaterial: EditingMaterial | null;
  hasHydrated: boolean;
  setText: (text: string) => void;
  setResult: (result: AdaptationResult) => void;
  clearResult: () => void;
  startEditingMaterial: (material: EditingMaterial & {
    sourceText: string;
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
      editingMaterial: null,
      hasHydrated: false,
      setText: (text) => set((state) => ({
        text,
        result: state.result?.kind === "structured" ? state.result : null,
      })),
      setResult: (result) => set({ result }),
      clearResult: () => set({ result: null }),
      startEditingMaterial: ({ id, title, sourceText, adaptation }) => set({
        text: sourceText,
        result: adaptation,
        editingMaterial: { id, title },
      }),
      clearEditingMaterial: () => set({ editingMaterial: null }),
      finishHydration: () => set({ hasHydrated: true }),
    }),
    {
      name: "study-reader-new-text",
      version: 6,
      storage: createJSONStorage(() => localStorage),
      // Restore after mount so the server and first browser render match.
      skipHydration: true,
      partialize: ({ text, result, editingMaterial }) => editingMaterial
        ? {
            text: "",
            result: null,
            editingMaterial,
          }
        : {
            text,
            result,
            editingMaterial: null,
          },
      migrate: (persisted) => {
        if (!persisted || typeof persisted !== "object") return persisted;
        const saved = persisted as Record<string, unknown>;
        return {
          text: typeof saved.text === "string" ? saved.text : "",
          result: isAdaptationResult(saved.result) ? saved.result : null,
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
