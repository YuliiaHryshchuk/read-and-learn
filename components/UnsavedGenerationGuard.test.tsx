// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useTextStore } from "@/stores/useTextStore";
import { UnsavedGenerationGuard } from "./UnsavedGenerationGuard";

const navigation = vi.hoisted(() => ({
  pathname: "/new-text",
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ push: navigation.push }),
}));

const generatedResult = {
  kind: "structured" as const,
  sourceText: "Hola mundo.",
  fragments: [{
    id: "fragment-1",
    text: "Hola mundo.",
    translation: "Hello world.",
    explanation: "",
  }],
};

function resetStore() {
  useTextStore.setState({
    text: "",
    result: null,
    targetLanguage: "English",
    resultLanguage: null,
    editingMaterial: null,
    hasUnsavedGeneration: false,
    hasHydrated: true,
  });
}

function dispatchBeforeUnload() {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  return event;
}

afterEach(() => {
  cleanup();
  navigation.pathname = "/new-text";
  navigation.push.mockReset();
  resetStore();
});

describe("unsaved generation state", () => {
  it("does not mark a generation from a new text as unsaved", () => {
    resetStore();

    useTextStore.getState().setResult(generatedResult, "English");

    expect(useTextStore.getState().hasUnsavedGeneration).toBe(false);
  });

  it("marks a newly generated explanation for a saved material as unsaved", () => {
    resetStore();
    useTextStore.getState().startEditingMaterial({
      id: "material-1",
      title: "Saved material",
      sourceText: generatedResult.sourceText,
      targetLanguage: "English",
      adaptation: generatedResult,
    });

    useTextStore.getState().setResult({
      ...generatedResult,
      fragments: [{
        ...generatedResult.fragments[0],
        explanation: "A newly generated explanation.",
      }],
    }, "English");

    expect(useTextStore.getState().hasUnsavedGeneration).toBe(true);
  });
});

describe("UnsavedGenerationGuard", () => {
  it("does not guard reloads on the new-text page", () => {
    navigation.pathname = "/new-text";
    useTextStore.setState({
      editingMaterial: { id: "material-1", title: "Saved material" },
      hasUnsavedGeneration: true,
    });
    render(<UnsavedGenerationGuard><main>New text</main></UnsavedGenerationGuard>);

    expect(dispatchBeforeUnload().defaultPrevented).toBe(false);
  });

  it("does not guard a saved material before a new explanation is generated", () => {
    navigation.pathname = "/edit/material-1";
    useTextStore.setState({
      editingMaterial: { id: "material-1", title: "Saved material" },
      hasUnsavedGeneration: false,
    });
    render(<UnsavedGenerationGuard><main>Saved text</main></UnsavedGenerationGuard>);

    expect(dispatchBeforeUnload().defaultPrevented).toBe(false);
  });

  it("guards reloads after a new explanation is generated for a saved material", () => {
    navigation.pathname = "/edit/material-1";
    useTextStore.setState({
      editingMaterial: { id: "material-1", title: "Saved material" },
      hasUnsavedGeneration: true,
    });
    render(<UnsavedGenerationGuard><main>Saved text</main></UnsavedGenerationGuard>);

    expect(dispatchBeforeUnload().defaultPrevented).toBe(true);
  });
});
