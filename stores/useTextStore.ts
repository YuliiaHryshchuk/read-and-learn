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
import {
  EXPLANATION_LANGUAGE_PREFERENCE_KEY,
  readLanguagePreference,
  writeLanguagePreference,
} from "@/lib/languagePreferences";

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
  hasUnsavedGeneration: boolean;
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
const RESULT_STORAGE_SUFFIX = "result";
const RESULT_SCHEMA_VERSION = 1;
const PERSIST_DEBOUNCE_MS = 400;
const initialTextState = {
  text: "",
  result: null,
  targetLanguage: TARGET_LANGUAGE,
  resultLanguage: null,
  editingMaterial: null,
  hasUnsavedGeneration: false,
  hasHydrated: false,
} satisfies Pick<
  TextState,
  | "text"
  | "result"
  | "targetLanguage"
  | "resultLanguage"
  | "editingMaterial"
  | "hasUnsavedGeneration"
  | "hasHydrated"
>;

function getDefaultTargetLanguage() {
  return readLanguagePreference(EXPLANATION_LANGUAGE_PREFERENCE_KEY)
    ?? TARGET_LANGUAGE;
}

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

function getResultStorageKey() {
  const draftKey = getScopedStorageKey(STORAGE_NAME);
  return draftKey ? `${draftKey}:${RESULT_STORAGE_SUFFIX}` : null;
}

type PersistedResult = {
  schemaVersion: typeof RESULT_SCHEMA_VERSION;
  result: AdaptationResult;
  resultLanguage: string;
};

function parsePersistedResult(value: unknown): PersistedResult | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  const resultLanguage = parseOptionalLanguage(candidate.resultLanguage);
  return candidate.schemaVersion === RESULT_SCHEMA_VERSION
    && isAdaptationResult(candidate.result)
    && resultLanguage
    ? {
        schemaVersion: RESULT_SCHEMA_VERSION,
        result: candidate.result,
        resultLanguage,
      }
    : null;
}

function readPersistedResult() {
  const key = getResultStorageKey();
  if (!key) return null;
  try {
    return parsePersistedResult(JSON.parse(localStorage.getItem(key) ?? "null"));
  } catch {
    return null;
  }
}

function persistResult(result: AdaptationResult, resultLanguage: string) {
  const key = getResultStorageKey();
  if (!key) return;
  try {
    const value: PersistedResult = {
      schemaVersion: RESULT_SCHEMA_VERSION,
      result,
      resultLanguage,
    };
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // The generated result remains available in memory if storage is unavailable.
  }
}

function removePersistedResult() {
  const key = getResultStorageKey();
  if (!key) return;
  try {
    localStorage.removeItem(key);
  } catch {
    // Storage may be unavailable in privacy-restricted browser contexts.
  }
}

function migrateLegacyResult() {
  const draftKey = getScopedStorageKey(STORAGE_NAME);
  if (!draftKey || readPersistedResult()) return;

  try {
    const legacyEnvelope = JSON.parse(localStorage.getItem(draftKey) ?? "null");
    const legacyState = legacyEnvelope?.state;
    if (!legacyState || typeof legacyState !== "object") return;

    const saved = legacyState as Record<string, unknown>;
    const resultLanguage = parseOptionalLanguage(saved.resultLanguage);
    if (
      !parseEditingMaterial(saved.editingMaterial)
      && isAdaptationResult(saved.result)
      && resultLanguage
    ) {
      persistResult(saved.result, resultLanguage);
    }
  } catch {
    // Invalid legacy data will be ignored by the normal persistence migration.
  }
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
    (set, get) => ({
      ...initialTextState,
      setText: (text) => set((state) => ({
        text,
        result: state.result?.kind === "structured" ? state.result : null,
      })),
      setTargetLanguage: (targetLanguage) => {
        set({ targetLanguage });
        writeLanguagePreference(
          EXPLANATION_LANGUAGE_PREFERENCE_KEY,
          targetLanguage,
        );
      },
      setResult: (result, resultLanguage) => {
        const isEditingSavedMaterial = Boolean(get().editingMaterial);
        set({
          result,
          resultLanguage,
          hasUnsavedGeneration: isEditingSavedMaterial,
        });
        if (!isEditingSavedMaterial) {
          persistResult(result, resultLanguage);
        }
      },
      clearResult: () => {
        set({
          result: null,
          resultLanguage: null,
          hasUnsavedGeneration: false,
        });
        removePersistedResult();
      },
      startNewText: () => {
        set({
          text: "",
          result: null,
          targetLanguage: getDefaultTargetLanguage(),
          resultLanguage: null,
          editingMaterial: null,
          hasUnsavedGeneration: false,
        });
        removePersistedResult();
      },
      startEditingMaterial: ({
        id,
        title,
        sourceText,
        targetLanguage,
        adaptation,
      }) => {
        set({
          text: sourceText,
          result: adaptation,
          targetLanguage,
          resultLanguage: targetLanguage,
          editingMaterial: { id, title },
          hasUnsavedGeneration: false,
        });
        removePersistedResult();
      },
      clearEditingMaterial: () => set({
        editingMaterial: null,
        targetLanguage: getDefaultTargetLanguage(),
        resultLanguage: null,
      }),
      finishHydration: () => set({ hasHydrated: true }),
    }),
    {
      name: STORAGE_NAME,
      version: 9,
      storage: createJSONStorage(() => scopedDebouncedStorage),
      // Restore after mount so the server and first browser render match.
      skipHydration: true,
      partialize: ({ text, targetLanguage, editingMaterial }) => editingMaterial
        ? {
            text: "",
            targetLanguage: TARGET_LANGUAGE,
          }
        : {
            text,
            targetLanguage,
          },
      migrate: (persisted) => {
        if (!persisted || typeof persisted !== "object") return persisted;
        const saved = persisted as Record<string, unknown>;
        return {
          text: typeof saved.text === "string" ? saved.text : "",
          targetLanguage: parseLanguage(saved.targetLanguage),
        };
      },
      merge: (persisted, current) => {
        if (!persisted || typeof persisted !== "object") return current;
        const saved = persisted as Record<string, unknown>;
        return {
          ...current,
          text: typeof saved.text === "string" ? saved.text : "",
          targetLanguage: parseLanguage(saved.targetLanguage),
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
  const draftStorageKey = getScopedStorageKey(STORAGE_NAME);
  let hasPersistedDraft = false;
  try {
    hasPersistedDraft = Boolean(
      draftStorageKey && localStorage.getItem(draftStorageKey),
    );
  } catch {
    // Continue with the preferred/default language when storage is unavailable.
  }

  // The old unscoped key cannot safely be assigned to any Puter account.
  try {
    localStorage.removeItem(STORAGE_NAME);
  } catch {
    // Continue with in-memory state when local storage is unavailable.
  }

  migrateLegacyResult();

  suppressPersistence = true;
  useTextStore.setState(initialTextState);
  suppressPersistence = false;

  try {
    await Promise.resolve(useTextStore.persist.rehydrate());
  } finally {
    const savedResult = readPersistedResult();
    suppressPersistence = true;
    if (savedResult) {
      useTextStore.setState({
        result: savedResult.result,
        resultLanguage: savedResult.resultLanguage,
        hasUnsavedGeneration: false,
      });
    }
    if (!hasPersistedDraft) {
      useTextStore.setState({ targetLanguage: getDefaultTargetLanguage() });
    }
    useTextStore.getState().finishHydration();
    suppressPersistence = false;
  }
}

export async function clearTextStoreForCurrentUser() {
  suppressPersistence = true;
  useTextStore.setState(initialTextState);
  suppressPersistence = false;

  try {
    await Promise.resolve(useTextStore.persist.clearStorage());
  } finally {
    removePersistedResult();
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
