import { MAX_TARGET_LANGUAGE_LENGTH } from "./languages";

export const STUDY_LANGUAGE_PREFERENCE_KEY = "preferredStudyLanguage";
export const EXPLANATION_LANGUAGE_PREFERENCE_KEY =
  "preferredExplanationLanguage";

export function readLanguagePreference(key: string) {
  if (typeof localStorage === "undefined") return null;

  try {
    const value = localStorage.getItem(key)?.trim();
    return value && value.length <= MAX_TARGET_LANGUAGE_LENGTH ? value : null;
  } catch {
    return null;
  }
}

export function writeLanguagePreference(key: string, language: string) {
  if (typeof localStorage === "undefined") return;

  try {
    const value = language.trim();
    if (value && value.length <= MAX_TARGET_LANGUAGE_LENGTH) {
      localStorage.setItem(key, value);
    } else {
      localStorage.removeItem(key);
    }
  } catch {
    // The current selection remains usable when browser storage is unavailable.
  }
}
