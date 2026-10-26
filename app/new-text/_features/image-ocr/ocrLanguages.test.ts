import { describe, expect, it } from "vitest";
import { EXPLANATION_LANGUAGES } from "@/lib/languages";
import { isOcrLanguage, OCR_LANGUAGES } from "./ocrLanguages";

describe("OCR languages", () => {
  it("keeps the PP-OCRv6 Latin options in explanation-language order", () => {
    expect(OCR_LANGUAGES).toEqual([
      { value: "en", label: "English" },
      { value: "es", label: "Spanish" },
      { value: "fr", label: "French" },
      { value: "de", label: "German" },
    ]);
    expect(OCR_LANGUAGES.every(({ label }) => (
      EXPLANATION_LANGUAGES.includes(label)
    ))).toBe(true);
  });

  it("validates only configured OCR language codes", () => {
    expect(isOcrLanguage("es")).toBe(true);
    expect(isOcrLanguage("ru")).toBe(false);
  });
});
