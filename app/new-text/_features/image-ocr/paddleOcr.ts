import type { OcrResult } from "@paddleocr/paddleocr-js";
import type { OcrLanguage } from "./ocrLanguages";

const DETECTION_MODEL_URL =
  "/ocr/models/PP-OCRv6_small_det_onnx_infer.bin";
const RECOGNITION_MODEL_URL =
  "/ocr/models/PP-OCRv6_small_rec_onnx_infer.bin";

type OcrClient = {
  predict: (input: Blob) => Promise<OcrResult[]>;
};

let clientPromise: Promise<OcrClient> | null = null;

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
      backend: "auto",
      numThreads: 1,
      simd: true,
    },
  });
}

function getClient(language: OcrLanguage) {
  // PP-OCRv6 uses the same multilingual model for every supported Latin language.
  clientPromise ??= createClient(language).catch((error) => {
    clientPromise = null;
    throw error;
  });
  return clientPromise;
}

export async function recognizeImage(image: Blob, language: OcrLanguage) {
  const client = await getClient(language);
  const [result] = await client.predict(image);

  if (!result) throw new Error("OCR did not return a result for this image.");

  return result;
}

export function resultToText(result: OcrResult) {
  return result.items
    .filter((item) => item.text.trim().length > 0)
    .map((item) => item.text.trim())
    .join("\n");
}
