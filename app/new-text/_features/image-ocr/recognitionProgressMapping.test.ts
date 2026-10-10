import { describe, expect, it } from "vitest";
import { mapRecognitionProgress } from "./recognitionProgressMapping";

describe("mapRecognitionProgress", () => {
  it("maps stage-local progress into one overall range", () => {
    const languageProgress = mapRecognitionProgress({
      status: "loading language traineddata",
      progress: 0.5,
      jobId: "job",
      userJobId: "user-job",
      workerId: "worker",
    });
    expect(languageProgress?.progress).toBeCloseTo(0.34);
    expect(languageProgress?.label).toBe("Loading language data…");

    expect(mapRecognitionProgress({
      status: "recognizing text",
      progress: 0.5,
      jobId: "job",
      userJobId: "user-job",
      workerId: "worker",
    })).toEqual({ progress: 0.75, label: "Recognizing text…" });
  });

  it("ignores unknown statuses", () => {
    expect(mapRecognitionProgress({
      status: "unknown",
      progress: 0.5,
      jobId: "job",
      userJobId: "user-job",
      workerId: "worker",
    })).toBeNull();
  });
});
