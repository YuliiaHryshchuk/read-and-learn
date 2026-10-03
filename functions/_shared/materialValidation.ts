import {
  isAdaptationResult,
  type StructuredAdaptationResult,
} from "../../lib/adaptation";
import { MAX_TARGET_LANGUAGE_LENGTH } from "../../lib/languages";
import { countWords } from "../../lib/text";

export type MaterialBody = {
  title: string;
  sourceText: string;
  sourceLanguage: string;
  targetLanguage: string;
  adaptation: StructuredAdaptationResult;
};

export const MAX_MATERIAL_REQUEST_BYTES = 250_000;
const MAX_TITLE_LENGTH = 120;
const MAX_SOURCE_LENGTH = 3_000;
const MAX_SOURCE_LANGUAGE_LENGTH = 100;

function isBoundedText(value: unknown, maxLength: number): value is string {
  return typeof value === "string"
    && value.trim().length > 0
    && value.length <= maxLength;
}

export function parseMaterialBody(value: unknown): MaterialBody | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  const expectedKeys = [
    "title",
    "sourceText",
    "sourceLanguage",
    "targetLanguage",
    "adaptation",
  ];
  if (
    Object.keys(body).length !== expectedKeys.length
    || !expectedKeys.every((key) => Object.hasOwn(body, key))
  ) {
    return null;
  }
  if (!isBoundedText(body.title, MAX_TITLE_LENGTH)) return null;
  if (!isBoundedText(body.sourceText, MAX_SOURCE_LENGTH)) return null;
  if (!isBoundedText(body.sourceLanguage, MAX_SOURCE_LANGUAGE_LENGTH)) {
    return null;
  }
  if (!isBoundedText(body.targetLanguage, MAX_TARGET_LANGUAGE_LENGTH)) {
    return null;
  }
  if (!isAdaptationResult(body.adaptation)) return null;
  if (body.adaptation.sourceText !== body.sourceText) return null;
  if (countWords(body.sourceText) > 300) return null;

  return {
    title: body.title.trim(),
    sourceText: body.sourceText,
    sourceLanguage: body.sourceLanguage.trim(),
    targetLanguage: body.targetLanguage.trim(),
    adaptation: body.adaptation,
  };
}
