export const OCR_LANGUAGES = {
  en: "English",
  ru: "Russian",
} as const;

export type OcrLanguage = keyof typeof OCR_LANGUAGES;
