import type { OcrResult } from "@paddleocr/paddleocr-js";
import type { OcrLanguage } from "./ocrLanguages";

const DETECTION_MODEL_URL =
  "/ocr/models/PP-OCRv6_small_det_onnx_infer.bin";
const RECOGNITION_MODEL_URL =
  "/ocr/models/PP-OCRv6_small_rec_onnx_infer.bin";
const WASM_PATHS = {
  mjs: "/ocr/ort/ort-wasm-simd-threaded.mjs",
  wasm: "/ocr/ort/ort-wasm-simd-threaded.wasm",
} as const;

type OcrClient = {
  dispose: () => Promise<void>;
  predict: (input: Blob) => Promise<OcrResult[]>;
};

export type OcrSession = {
  dispose: () => Promise<void>;
  recognize: (image: Blob) => Promise<OcrResult>;
};

async function createClient(language: OcrLanguage): Promise<OcrClient> {
  const { PaddleOCR } = await import("@paddleocr/paddleocr-js");

  return PaddleOCR.create({
    lang: language,
    ocrVersion: "PP-OCRv6",
    textDetectionModelName: "PP-OCRv6_small_det",
    textDetectionModelAsset: { url: DETECTION_MODEL_URL },
    textRecognitionModelName: "PP-OCRv6_small_rec",
    textRecognitionModelAsset: { url: RECOGNITION_MODEL_URL },
    worker: true,
    ortOptions: {
      backend: "wasm",
      // PaddleOCR 0.4.2 still types this option as a string, while its
      // ONNX Runtime 1.30 dependency also accepts explicit module/binary URLs.
      // Explicit URLs prevent ORT from selecting the oversized JSEP build.
      wasmPaths: WASM_PATHS as unknown as string,
      numThreads: 1,
      simd: true,
    },
  });
}

export async function createOcrSession(
  language: OcrLanguage,
): Promise<OcrSession> {
  const client = await createClient(language);

  return {
    dispose: () => client.dispose(),
    async recognize(image) {
      const [result] = await client.predict(image);

      if (!result) throw new Error("OCR did not return a result for this image.");

      return result;
    },
  };
}

export function resultToText(result: OcrResult) {
  return result.items
    .filter((item) => item.text.trim().length > 0)
    .map((item) => item.text.trim())
    .join("\n");
}
