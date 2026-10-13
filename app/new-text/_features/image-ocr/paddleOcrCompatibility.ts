import type { PaddleOCRCreateOptions } from "@paddleocr/paddleocr-js";
import type { Env } from "onnxruntime-web";

type PaddleOrtOptions = NonNullable<PaddleOCRCreateOptions["ortOptions"]>;

type WorkerOrtOptions = Omit<PaddleOrtOptions, "wasmPaths"> & {
  wasmPaths: Env.WasmFilePaths;
};

/**
 * PaddleOCR 0.4.2 declares wasmPaths as a string, while the ONNX Runtime
 * version it uses also supports explicit module and binary URLs. Keep that
 * temporary type mismatch at the package boundary instead of leaking a cast
 * into the OCR configuration.
 */
export function createWorkerOrtOptions({
  wasmPaths,
  ...options
}: WorkerOrtOptions): PaddleOrtOptions {
  const compatibleOptions: PaddleOrtOptions = options;
  Reflect.set(compatibleOptions, "wasmPaths", wasmPaths);
  return compatibleOptions;
}
