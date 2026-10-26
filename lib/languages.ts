export const SOURCE_LANGUAGE = "Unspecified";
export const TARGET_LANGUAGE = "English";
export const MAX_TARGET_LANGUAGE_LENGTH = 20;

export const EXPLANATION_LANGUAGES = [
  "English",
  "Spanish",
  "Ukrainian",
  "French",
  "German",
  "Russian",
] as const;

export type ExplanationLanguage = (typeof EXPLANATION_LANGUAGES)[number];
