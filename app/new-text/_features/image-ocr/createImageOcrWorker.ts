import type Tesseract from "tesseract.js";
import {
  TESSERACT_WORKER_OPTIONS,
  type TesseractLanguage,
} from "./tesseractRuntime";

export async function createImageOcrWorker(
  language: TesseractLanguage,
  logger: (message: Tesseract.LoggerMessage) => void,
) {
  const { createWorker, OEM } = await import("tesseract.js");

  return createWorker(language, OEM.LSTM_ONLY, {
    ...TESSERACT_WORKER_OPTIONS,
    logger,
  });
}
