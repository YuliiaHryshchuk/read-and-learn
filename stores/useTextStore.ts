"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { isAdaptationResult, type AdaptationResult } from "@/lib/adaptation";

type TextState = {
  text: string;
  result: AdaptationResult | null;
  hasHydrated: boolean;
  setText: (text: string) => void;
  setResult: (result: AdaptationResult) => void;
  clearResult: () => void;
  finishHydration: () => void;
};

export const useTextStore = create<TextState>()(
  persist(
    (set) => ({
      text: "",
      result: null,
      hasHydrated: false,
      setText: (text) => set({ text, result: null }),
      setResult: (result) => set({ result }),
      clearResult: () => set({ result: null }),
      finishHydration: () => set({ hasHydrated: true }),
    }),
    {
      name: "study-reader-new-text",
      version: 4,
      storage: createJSONStorage(() => localStorage),
      // Restore after mount so the server and first browser render match.
      skipHydration: true,
      partialize: ({ text, result }) => ({ text, result }),
      migrate: (persisted) => {
        if (!persisted || typeof persisted !== "object") return persisted;
        const saved = persisted as Record<string, unknown>;
        return {
          text: typeof saved.text === "string" ? saved.text : "",
          result: isAdaptationResult(saved.result) ? saved.result : null,
        };
      },
      merge: (persisted, current) => {
        if (!persisted || typeof persisted !== "object") return current;
        const saved = persisted as Record<string, unknown>;
        return {
          ...current,
          text: typeof saved.text === "string" ? saved.text : "",
          result: isAdaptationResult(saved.result) ? saved.result : null,
        };
      },
    },
  ),
);
