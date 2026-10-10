import type Tesseract from "tesseract.js";

type ProgressStage = {
  start: number;
  span: number;
  label: string;
};

const PROGRESS_STAGES: Record<string, ProgressStage> = {
  "loading tesseract core": {
    start: 0,
    span: 0.18,
    label: "Loading recognition engine…",
  },
  "initializing tesseract": {
    start: 0.18,
    span: 0.07,
    label: "Preparing recognition…",
  },
  "loading language traineddata": {
    start: 0.25,
    span: 0.18,
    label: "Loading language data…",
  },
  "initializing api": {
    start: 0.43,
    span: 0.07,
    label: "Preparing recognition…",
  },
  "recognizing text": {
    start: 0.5,
    span: 0.5,
    label: "Recognizing text…",
  },
};

export type RecognitionProgress = {
  progress: number;
  label: string;
};

export function mapRecognitionProgress(
  message: Tesseract.LoggerMessage,
): RecognitionProgress | null {
  const stage = PROGRESS_STAGES[message.status];
  if (!stage) return null;

  const stageProgress = Math.min(1, Math.max(0, message.progress ?? 0));
  return {
    progress: Math.min(1, stage.start + stageProgress * stage.span),
    label: stage.label,
  };
}


