import type Tesseract from "tesseract.js";

export const TESSERACT_LANGUAGES = {
  eng: "English",
  rus: "Russian",
} as const;

export type TesseractLanguage = keyof typeof TESSERACT_LANGUAGES;

export const TESSERACT_WORKER_OPTIONS = {
  workerPath: "/tesseract/worker.min.js",
  corePath: "/tesseract/core",
  langPath: "/tessdata",
  gzip: true,
  legacyCore: false,
  legacyLang: false,
  workerBlobURL: false,
} satisfies Partial<Tesseract.WorkerOptions>;

