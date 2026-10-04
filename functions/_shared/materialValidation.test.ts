import { describe, expect, it } from "vitest";
import { makeAdaptation } from "@/test/fixtures";
import { parseMaterialBody } from "./materialValidation";

function validBody() {
  const adaptation = makeAdaptation();
  return {
    title: "  Lesson  ",
    sourceText: adaptation.sourceText,
    sourceLanguage: "  Spanish ",
    targetLanguage: " English ",
    adaptation,
  };
}

describe("parseMaterialBody", () => {
  it("accepts valid material data and trims labels", () => {
    expect(parseMaterialBody(validBody())).toMatchObject({
      title: "Lesson",
      sourceLanguage: "Spanish",
      targetLanguage: "English",
    });
  });

  it.each([
    null,
    [],
    { ...validBody(), extra: true },
    { ...validBody(), title: " " },
    { ...validBody(), targetLanguage: "x".repeat(21) },
    { ...validBody(), sourceText: "different" },
  ])("rejects invalid material data", (value) => {
    expect(parseMaterialBody(value)).toBeNull();
  });

  it("rejects text over the word limit", () => {
    const sourceText = Array.from({ length: 301 }, () => "word").join(" ");
    expect(parseMaterialBody({
      ...validBody(),
      sourceText,
      adaptation: makeAdaptation(sourceText),
    })).toBeNull();
  });
});
