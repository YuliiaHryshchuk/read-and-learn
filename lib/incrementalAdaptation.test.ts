import { describe, expect, it } from "vitest";
import { makeAdaptation } from "@/test/fixtures";
import { InvalidAdaptationError } from "./adaptation";
import {
  isAdaptationOutdated,
  mergeIncrementalAdaptation,
  planIncrementalAdaptation,
} from "./incrementalAdaptation";

describe("incremental adaptation", () => {
  it("reuses every fragment when only whitespace changes", () => {
    const previous = makeAdaptation();
    const plan = planIncrementalAdaptation("Hola mundo.\nAdiós mundo.", previous);
    expect(plan.fragmentsToProcess).toEqual([]);
    expect(plan.fragments.every((fragment) => fragment.reused)).toBe(true);
    expect(isAdaptationOutdated("Hola mundo.\nAdiós mundo.", previous)).toBe(false);
  });

  it("processes only the changed sentence", () => {
    const plan = planIncrementalAdaptation(
      "Hola mundo. Hasta luego.",
      makeAdaptation(),
    );
    expect(plan.fragments[0].reused?.translation).toBe("Translation 1");
    expect(plan.fragmentsToProcess).toEqual([
      { id: "fragment-2", text: "Hasta luego." },
    ]);
  });

  it("does not reuse ambiguous insertions inside a fragment boundary", () => {
    const plan = planIncrementalAdaptation(
      "Hola mundo nuevo. Adiós mundo.",
      makeAdaptation(),
    );
    expect(plan.fragmentsToProcess.length).toBeGreaterThan(0);
    expect(isAdaptationOutdated(plan.sourceText, makeAdaptation())).toBe(true);
  });

  it("merges generated and reused fragments", () => {
    const plan = planIncrementalAdaptation("Hola mundo. Hasta luego.", makeAdaptation());
    const merged = mergeIncrementalAdaptation(plan, [{
      id: "fragment-2",
      text: "Hasta luego.",
      translation: "See you later.",
      explanation: "",
    }]);
    expect(merged.fragments.map(({ translation }) => translation)).toEqual([
      "Translation 1",
      "See you later.",
    ]);
  });

  it("rejects missing or mismatched generated fragments", () => {
    const plan = planIncrementalAdaptation("Hola mundo. Hasta luego.", makeAdaptation());
    expect(() => mergeIncrementalAdaptation(plan, [])).toThrow(InvalidAdaptationError);
    expect(() => mergeIncrementalAdaptation(plan, [{
      id: "fragment-2",
      text: "wrong",
      translation: "Wrong",
      explanation: "",
    }])).toThrow(InvalidAdaptationError);
  });
});
