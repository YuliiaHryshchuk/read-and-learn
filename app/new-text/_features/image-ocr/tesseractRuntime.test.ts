import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { TESSERACT_WORKER_OPTIONS } from "./tesseractRuntime";

const LOCAL_RUNTIME_FILES = [
  "public/tesseract/worker.min.js",
  "public/tesseract/core/tesseract-core-lstm.wasm.js",
  "public/tesseract/core/tesseract-core-simd-lstm.wasm.js",
  "public/tesseract/core/tesseract-core-relaxedsimd-lstm.wasm.js",
  "public/tessdata/eng.traineddata.gz",
  "public/tessdata/rus.traineddata.gz",
];

describe("local Tesseract runtime", () => {
  it("uses only same-origin paths", () => {
    const paths = [
      TESSERACT_WORKER_OPTIONS.workerPath,
      TESSERACT_WORKER_OPTIONS.corePath,
      TESSERACT_WORKER_OPTIONS.langPath,
    ];

    expect(paths.every((path) => path.startsWith("/"))).toBe(true);
    expect(paths.every((path) => !path.startsWith("//"))).toBe(true);
  });

  it("includes every configured runtime asset", () => {
    for (const file of LOCAL_RUNTIME_FILES) {
      expect(existsSync(join(process.cwd(), file)), file).toBe(true);
    }
  });
});

