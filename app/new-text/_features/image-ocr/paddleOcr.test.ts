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

  it("distinguishes text from empty or punctuation-only OCR output", () => {
    expect(containsRecognizableText("Hola, mundo!")).toBe(true);
    expect(containsRecognizableText("中文")).toBe(true);
    expect(containsRecognizableText("123")).toBe(true);
    expect(containsRecognizableText("  ... , — - ;:  ")).toBe(false);
    expect(containsRecognizableText("\n\t")).toBe(false);
  });
});
