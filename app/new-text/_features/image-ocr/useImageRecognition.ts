"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type Tesseract from "tesseract.js";
import { createImageOcrWorker } from "./createImageOcrWorker";
import { mapRecognitionProgress } from "./recognitionProgressMapping";
import type { TesseractLanguage } from "./tesseractRuntime";

export type ImageRecognitionState =
  | { status: "idle" }
  | { status: "recognizing"; progress: number; label: string }
  | { status: "success"; text: string }
  | { status: "empty" }
  | { status: "error"; message: string };

const INITIAL_PROGRESS: ImageRecognitionState = {
  status: "recognizing",
  progress: 0,
  label: "Starting recognition…",
};

export default function useImageRecognition() {
  const [state, setState] = useState<ImageRecognitionState>({ status: "idle" });
  const workerRef = useRef<Tesseract.Worker | null>(null);
  const runIdRef = useRef(0);

  const terminateWorker = useCallback(() => {
    const worker = workerRef.current;
    workerRef.current = null;
    if (worker) void worker.terminate().catch(() => undefined);
  }, []);

  const cancel = useCallback(() => {
    runIdRef.current += 1;
    terminateWorker();
    setState({ status: "idle" });
  }, [terminateWorker]);

  const recognize = useCallback(async (
    image: File,
    language: TesseractLanguage,
  ) => {
    const runId = runIdRef.current + 1;
    runIdRef.current = runId;
    terminateWorker();
    setState(INITIAL_PROGRESS);

    try {
      const worker = await createImageOcrWorker(language, (message) => {
        if (runIdRef.current !== runId) return;
        const nextProgress = mapRecognitionProgress(message);
        if (!nextProgress) return;

        setState((current) => {
          if (current.status !== "recognizing") return current;
          return {
            status: "recognizing",
            progress: Math.max(current.progress, nextProgress.progress),
            label: nextProgress.label,
          };
        });
      });

      if (runIdRef.current !== runId) {
        await worker.terminate().catch(() => undefined);
        return;
      }

      workerRef.current = worker;
      const result = await worker.recognize(image);
      if (runIdRef.current !== runId) return;

      const text = result.data.text.replace(/\r\n?/g, "\n").trim();
      setState(text ? { status: "success", text } : { status: "empty" });
    } catch {
      if (runIdRef.current !== runId) return;
      setState({
        status: "error",
        message: "We couldn't recognize the text. Try another image or language.",
      });
    } finally {
      if (runIdRef.current === runId) terminateWorker();
    }
  }, [terminateWorker]);

  const setRecognizedText = useCallback((text: string) => {
    setState({ status: "success", text });
  }, []);

  useEffect(() => () => {
    runIdRef.current += 1;
    terminateWorker();
  }, [terminateWorker]);

  return { state, recognize, cancel, setRecognizedText };
}
