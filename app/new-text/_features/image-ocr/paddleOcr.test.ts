import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  containsRecognizableText,
  createOcrSession,
  resultToText,
} from "./paddleOcr";

const paddleMocks = vi.hoisted(() => ({
  create: vi.fn(),
  dispose: vi.fn(async () => {}),
  predict: vi.fn(),
}));

vi.mock("@paddleocr/paddleocr-js", () => ({
  PaddleOCR: { create: paddleMocks.create },
}));

beforeEach(() => {
  vi.clearAllMocks();
  paddleMocks.predict.mockResolvedValue([{ items: [] }]);
  paddleMocks.create.mockResolvedValue({
    dispose: paddleMocks.dispose,
    predict: paddleMocks.predict,
  });
});

describe("PaddleOCR session", () => {
  it("uses the local WASM runtime and releases the worker", async () => {
    const session = await createOcrSession("en");
    const image = new Blob(["image"], { type: "image/jpeg" });

    await session.recognize(image);
    await session.dispose();

    expect(paddleMocks.create).toHaveBeenCalledWith(expect.objectContaining({
      initialize: false,
      worker: true,
      ortOptions: {
        backend: "wasm",
        wasmPaths: {
          mjs: "/ocr/ort/ort-wasm-simd-threaded.mjs",
          wasm: "/ocr/ort/ort-wasm-simd-threaded.wasm",
        },
        numThreads: 1,
        simd: true,
      },
    }));
    expect(paddleMocks.predict).toHaveBeenCalledWith(image);
    expect(paddleMocks.dispose).toHaveBeenCalledTimes(1);
  });

  it("converts recognized lines to editable text", () => {
    expect(resultToText({
      items: [
        { text: " First line " },
        { text: "" },
        { text: "Second line" },
      ],
    } as Parameters<typeof resultToText>[0])).toBe("First line\nSecond line");
  });

  it("reads multi-column text down each column instead of across rows", () => {
    const line = (
      text: string,
      left: number,
      top: number,
      width = 80,
      height = 10,
    ) => ({
      text,
      score: 0.99,
      poly: [
        [left, top],
        [left + width, top],
        [left + width, top + height],
        [left, top + height],
      ],
    });

    expect(resultToText({
      items: [
        line("Questions", 0, 0, 200),
        line("Left one", 0, 40),
        line("Right one", 120, 42),
        line("Right two", 120, 57),
        line("Left two", 0, 60),
        line("Right three", 120, 72),
        line("Left three", 0, 80),
        line("Footer", 0, 115, 200),
      ],
    } as Parameters<typeof resultToText>[0])).toBe([
      "Questions",
      "Left one",
      "Left two",
      "Left three",
      "Right one",
      "Right two",
      "Right three",
      "Footer",
    ].join("\n"));
  });

  it("sorts ordinary single-column text from top to bottom", () => {
    expect(resultToText({
      items: [
        {
          text: "Second",
          score: 0.99,
          poly: [[0, 20], [80, 20], [80, 30], [0, 30]],
        },
        {
          text: "First",
          score: 0.99,
          poly: [[0, 0], [80, 0], [80, 10], [0, 10]],
        },
      ],
    } as Parameters<typeof resultToText>[0])).toBe("First\nSecond");
  });

  it("uses the bounds of skewed polygons when restoring columns", () => {
    expect(resultToText({
      items: [
        {
          text: "Left top",
          score: 0.99,
          poly: [[2, 2], [78, 0], [80, 10], [0, 12]],
        },
        {
          text: "Right top",
          score: 0.99,
          poly: [[122, 5], [198, 3], [200, 13], [120, 15]],
        },
        {
          text: "Right bottom",
          score: 0.99,
          poly: [[120, 25], [200, 23], [202, 33], [122, 35]],
        },
        {
          text: "Left bottom",
          score: 0.99,
          poly: [[0, 27], [80, 25], [82, 35], [2, 37]],
        },
      ],
    } as Parameters<typeof resultToText>[0])).toBe([
      "Left top",
      "Left bottom",
      "Right top",
      "Right bottom",
    ].join("\n"));
  });

  it("distinguishes text from empty or punctuation-only OCR output", () => {
    expect(containsRecognizableText("Hola, mundo!")).toBe(true);
    expect(containsRecognizableText("中文")).toBe(true);
    expect(containsRecognizableText("123")).toBe(true);
    expect(containsRecognizableText("  ... , — - ;:  ")).toBe(false);
    expect(containsRecognizableText("\n\t")).toBe(false);
  });
});
