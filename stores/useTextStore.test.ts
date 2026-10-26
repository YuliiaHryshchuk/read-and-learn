// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import { useTextStore } from "./useTextStore";

beforeEach(() => {
  localStorage.clear();
  useTextStore.setState({
    text: "",
    result: null,
    targetLanguage: "English",
    resultLanguage: null,
    editingMaterial: null,
    hasUnsavedGeneration: false,
    hasHydrated: false,
  });
});

describe("language preferences", () => {
  it("stores the selected explanation language", () => {
    useTextStore.getState().setTargetLanguage("Spanish");

    expect(localStorage.getItem("preferredExplanationLanguage"))
      .toBe("Spanish");
  });

  it("uses the preferred explanation language for a new text", () => {
    localStorage.setItem("preferredExplanationLanguage", "French");

    useTextStore.getState().startNewText();

    expect(useTextStore.getState().targetLanguage).toBe("French");
  });
});
