import { describe, expect, it } from "vitest";
import { makeAdaptation } from "@/test/fixtures";
import {
  createAdaptationSchema,
  decodeStoredAdaptation,
  InvalidAdaptationError,
  isAdaptationResult,
  parseExplanationItems,
  parseModelAdaptation,
  serializeStoredAdaptation,
  splitIntoFragments,
} from "./adaptation";

describe("splitIntoFragments", () => {
  it("returns no fragments for whitespace", () => {
    expect(splitIntoFragments("  \n ")).toEqual([]);
  });

  it("prefers sentence boundaries and preserves exact source slices", () => {
    const first = Array.from({ length: 30 }, (_, i) => `a${i}`).join(" ") + ".";
    const second = Array.from({ length: 30 }, (_, i) => `b${i}`).join(" ") + ".";
    const source = `${first}\n\n${second}`;
    expect(splitIntoFragments(source)).toEqual([
      { id: "fragment-1", text: first },
      { id: "fragment-2", text: second },
    ]);
  });

  it("rebalances a hard split to avoid a tiny trailing fragment", () => {
    const source = Array.from({ length: 52 }, (_, i) => `word${i}`).join(" ");
    expect(splitIntoFragments(source).map(({ text }) => text.split(" ").length))
      .toEqual([47, 5]);
  });
});

describe("adaptation schema and parsing", () => {
  const fragments = [
    { id: "fragment-1", text: "Hola." },
    { id: "fragment-2", text: "Adiós." },
  ];

  it("builds a strict schema keyed by fragment ID", () => {
    const schema = createAdaptationSchema(fragments, "English");
    expect(schema.required).toEqual(["fragment-1", "fragment-2"]);
    expect(schema.additionalProperties).toBe(false);
    expect(schema.properties["fragment-1"].required).toEqual([
      "translation",
      "explanation",
    ]);
  });

  it("parses a valid model response and strips invisible key characters", () => {
    const content = JSON.stringify({
      "fragment-1": { translation: "Hello.", "expla\u00adnation": "hola — hello" },
      "fragment-2": { translation: "Goodbye.", explanation: "" },
    });
    const result = parseModelAdaptation(content, "Hola. Adiós.", fragments);
    expect(result.fragments[0]).toMatchObject({
      text: "Hola.",
      translation: "Hello.",
      explanation: "hola — hello",
    });
  });

  it.each([
    ["not json"],
    [JSON.stringify([])],
    [JSON.stringify({ "fragment-1": { translation: "Hello", explanation: "" } })],
    [JSON.stringify({
      "fragment-1": { translation: "", explanation: "" },
      "fragment-2": { translation: "Bye", explanation: "", extra: true },
    })],
  ])("rejects invalid model response %j", (content) => {
    expect(() => parseModelAdaptation(content, "Hola. Adiós.", fragments))
      .toThrow(InvalidAdaptationError);
  });

  it("turns explanation lines and continuations into display items", () => {
    expect(parseExplanationItems("hola — hello\ncontinued.\nadiós — goodbye"))
      .toEqual([
        { term: "hola", meaning: "hello continued." },
        { term: "adiós", meaning: "goodbye" },
      ]);
  });
});

describe("stored adaptations", () => {
  it("validates source coverage and fragment ordering", () => {
    expect(isAdaptationResult(makeAdaptation())).toBe(true);
    expect(isAdaptationResult({
      ...makeAdaptation(),
      fragments: makeAdaptation().fragments.toReversed(),
    })).toBe(false);
  });

  it("round-trips versioned values and accepts legacy values", () => {
    const adaptation = makeAdaptation();
    expect(decodeStoredAdaptation(JSON.parse(serializeStoredAdaptation(adaptation))))
      .toEqual(adaptation);
    expect(decodeStoredAdaptation(adaptation)).toEqual(adaptation);
  });

  it("rejects unknown versions and extra fields", () => {
    expect(decodeStoredAdaptation({
      schemaVersion: 2,
      ...makeAdaptation(),
    })).toBeNull();
    expect(decodeStoredAdaptation({
      schemaVersion: 1,
      ...makeAdaptation(),
      extra: true,
    })).toBeNull();
  });
});
