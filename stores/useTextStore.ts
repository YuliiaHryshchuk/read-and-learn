"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { StateStorage } from "zustand/middleware";
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

const STORAGE_NAME = "study-reader-new-text";
const PERSIST_DEBOUNCE_MS = 400;
const initialTextState = {
  text: "",
  result: null,
  targetLanguage: TARGET_LANGUAGE,
  resultLanguage: null,
  editingMaterial: null,
  hasHydrated: false,
} satisfies Pick<
  TextState,
  | "text"
  | "result"
  | "targetLanguage"
  | "resultLanguage"
  | "editingMaterial"
  | "hasHydrated"
>;

let activeStorageOwner: string | null = null;
let pendingWrite: { key: string; value: string } | null = null;
let pendingWriteTimer: ReturnType<typeof setTimeout> | null = null;
let suppressPersistence = false;
let hasPageHideListener = false;

function getScopedStorageKey(name: string) {
  return activeStorageOwner
    ? `${name}:${encodeURIComponent(activeStorageOwner)}`
    : null;
}

function cancelPendingWrite(key?: string) {
  if (key && pendingWrite?.key !== key) return;
  if (pendingWriteTimer) clearTimeout(pendingWriteTimer);
  pendingWriteTimer = null;
  pendingWrite = null;
}

function flushPendingWrite() {
  if (!pendingWrite) return;
  const write = pendingWrite;
  cancelPendingWrite();
  try {
    localStorage.setItem(write.key, write.value);
  } catch {
    // The in-memory draft remains usable if storage is unavailable or full.
  }
}

const scopedDebouncedStorage: StateStorage = {
  getItem(name) {
    const key = getScopedStorageKey(name);
    if (!key) return null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(name, value) {
    if (suppressPersistence) return;
    const key = getScopedStorageKey(name);
    if (!key) return;

    cancelPendingWrite();
    pendingWrite = { key, value };
    pendingWriteTimer = setTimeout(flushPendingWrite, PERSIST_DEBOUNCE_MS);
    if (!hasPageHideListener && typeof window !== "undefined") {
      window.addEventListener("pagehide", flushPendingWrite);
      hasPageHideListener = true;
    }
  },
  removeItem(name) {
    const key = getScopedStorageKey(name);
    if (!key) return;
    cancelPendingWrite(key);
    try {
      localStorage.removeItem(key);
    } catch {
      // Storage may be unavailable in privacy-restricted browser contexts.
    }
  },
};

export const useTextStore = create<TextState>()(
  persist(
    (set) => ({
      ...initialTextState,
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
      name: STORAGE_NAME,
      version: 8,
      storage: createJSONStorage(() => scopedDebouncedStorage),
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

export async function activateTextStoreForUser(userUuid: string) {
  const owner = userUuid.trim();
  if (!owner) return;
  if (
    activeStorageOwner === owner
    && useTextStore.getState().hasHydrated
  ) {
    return;
  }

  flushPendingWrite();
  activeStorageOwner = owner;

  // The old unscoped key cannot safely be assigned to any Puter account.
  try {
    localStorage.removeItem(STORAGE_NAME);
  } catch {
    // Continue with in-memory state when local storage is unavailable.
  }

  suppressPersistence = true;
  useTextStore.setState(initialTextState);
  suppressPersistence = false;

  try {
    await Promise.resolve(useTextStore.persist.rehydrate());
  } finally {
    useTextStore.getState().finishHydration();
  }
}

export async function clearTextStoreForCurrentUser() {
  suppressPersistence = true;
  useTextStore.setState(initialTextState);
  suppressPersistence = false;

  try {
    await Promise.resolve(useTextStore.persist.clearStorage());
  } finally {
    cancelPendingWrite();
    activeStorageOwner = null;
  }
}

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
