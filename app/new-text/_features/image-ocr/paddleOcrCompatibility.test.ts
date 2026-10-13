import { describe, expect, it } from "vitest";
import { createWorkerOrtOptions } from "./paddleOcrCompatibility";

describe("PaddleOCR compatibility options", () => {
  it("passes explicit ONNX Runtime module and binary paths to PaddleOCR", () => {
    expect(createWorkerOrtOptions({
      backend: "wasm",
      numThreads: 1,
      simd: true,
      wasmPaths: {
        mjs: "/ocr/ort/ort-wasm-simd-threaded.mjs",
        wasm: "/ocr/ort/ort-wasm-simd-threaded.wasm",
      },
    })).toEqual({
      backend: "wasm",
      numThreads: 1,
      simd: true,
      wasmPaths: {
        mjs: "/ocr/ort/ort-wasm-simd-threaded.mjs",
        wasm: "/ocr/ort/ort-wasm-simd-threaded.wasm",
      },
    });
  });
});
