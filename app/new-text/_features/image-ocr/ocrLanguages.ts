import {
  EXPLANATION_LANGUAGES,
  type ExplanationLanguage,
} from "@/lib/languages";

const PP_OCR_V6_LANGUAGE_CODES = {
  English: "en",
  Spanish: "es",
  French: "fr",
  German: "de",
} as const satisfies Partial<Record<ExplanationLanguage, string>>;

export type OcrLanguage =
  (typeof PP_OCR_V6_LANGUAGE_CODES)[keyof typeof PP_OCR_V6_LANGUAGE_CODES];

export const OCR_LANGUAGES = EXPLANATION_LANGUAGES.flatMap((label) => {
  const code = PP_OCR_V6_LANGUAGE_CODES[
    label as keyof typeof PP_OCR_V6_LANGUAGE_CODES
  ];

  return code ? [{ value: code, label }] : [];
});

export function isOcrLanguage(value: string): value is OcrLanguage {
  return OCR_LANGUAGES.some((language) => language.value === value);
}
