"use client";

import { useCallback, useState } from "react";
import { usePuterAuth } from "@/components/PuterAuthProvider";
import {
  createAdaptationSchema,
  InvalidAdaptationError,
  parseModelAdaptation,
  splitIntoFragments,
  type AdaptationResult,
} from "@/lib/adaptation";
import { buildAdaptationMessages } from "@/lib/ai/adaptationPrompt";
import {
  PuterAIGenerationLimitError,
  PuterAIResponseError,
  requestPuterStructuredOutput,
} from "@/lib/ai/puterAdapter";
import {
  mergeIncrementalAdaptation,
  planIncrementalAdaptation,
} from "@/lib/incrementalAdaptation";
import { useTextStore } from "@/stores/useTextStore";

export const MAX_TEXT_WORDS = 300;
export const MAX_TEXT_CHARACTERS = 3_000;

type GenerationOptions = {
  text: string;
  result: AdaptationResult | null;
  targetLanguage: string;
  resultLanguage: string | null;
  hasHydrated: boolean;
  isLoadingSavedMaterial: boolean;
  isOverWordLimit: boolean;
};

function getErrorCode(error: unknown) {
  if (!error || typeof error !== "object") return undefined;
  const candidate = error as { error?: unknown; code?: unknown };
  return typeof candidate.error === "string"
    ? candidate.error
    : typeof candidate.code === "string"
      ? candidate.code
      : undefined;
}

function getGenerationErrorMessage(error: unknown) {
  if (error instanceof PuterAIGenerationLimitError) {
    return "Puter used the entire generation limit without producing a complete answer. Please try again.";
  }
  if (
    error instanceof InvalidAdaptationError
    || error instanceof PuterAIResponseError
  ) {
    return "The material could not be processed correctly. Please try again.";
  }

  const code = getErrorCode(error);
  if (code === "insufficient_funds") {
    return "Your Puter AI allowance or credits are exhausted. Check your Puter balance and try again.";
  }
  if (code === "subscription_required") {
    return "This AI request requires a paid Puter plan.";
  }
  if (code === "too_many_requests") {
    return "Puter is receiving too many requests. Please try again later.";
  }
  if (
    code === "auth_window_closed"
    || code === "popup_blocked"
    || code === "unauthorized"
  ) {
    return "Puter sign-in did not complete. Please sign in again and retry.";
  }

  if (error && typeof error === "object") {
    const candidate = error as { message?: unknown; msg?: unknown };
    const message = candidate.message ?? candidate.msg;
    if (typeof message === "string" && message) return message;
  }
  return "Could not generate a response with Puter. Please try again.";
}

export function useAdaptationGeneration({
  text,
  result,
  targetLanguage,
  resultLanguage,
  hasHydrated,
  isLoadingSavedMaterial,
  isOverWordLimit,
}: GenerationOptions) {
  const { requireAuthToken } = usePuterAuth();
  const setResult = useTextStore((state) => state.setResult);
  const [isPending, setIsPending] = useState(false);
  const [generationMessage, setGenerationMessage] = useState<string | null>(null);
  const effectiveTargetLanguage = targetLanguage.trim();

  const generate = useCallback(async (forceRegenerate = false) => {
    if (isPending || isLoadingSavedMaterial || !hasHydrated) return;
    if (!text.trim()) {
      setGenerationMessage("Enter some text first.");
      return;
    }
    if (text.length > MAX_TEXT_CHARACTERS || isOverWordLimit) {
      setGenerationMessage(`Use up to ${MAX_TEXT_WORDS} words.`);
      return;
    }
    if (!effectiveTargetLanguage) {
      setGenerationMessage("Choose an explanation language.");
      return;
    }

    setIsPending(true);
    setGenerationMessage("");
    try {
      const previousResult =
        forceRegenerate || resultLanguage !== effectiveTargetLanguage
          ? null
          : result;
      const updatePlan = previousResult
        ? planIncrementalAdaptation(text, previousResult)
        : null;
      const sourceFragments =
        updatePlan?.fragmentsToProcess ?? splitIntoFragments(text);

      if (updatePlan && sourceFragments.length === 0) {
        setResult(
          mergeIncrementalAdaptation(updatePlan, []),
          effectiveTargetLanguage,
        );
        setGenerationMessage("The explanation is up to date.");
        return;
      }

      await requireAuthToken();
      const generatedText = await requestPuterStructuredOutput({
        messages: buildAdaptationMessages(
          sourceFragments,
          effectiveTargetLanguage,
        ),
        schema: createAdaptationSchema(
          sourceFragments,
          effectiveTargetLanguage,
        ),
      });

      try {
        const processed = parseModelAdaptation(
          generatedText,
          text,
          sourceFragments,
        );
        setResult(
          updatePlan
            ? mergeIncrementalAdaptation(updatePlan, processed.fragments)
            : processed,
          effectiveTargetLanguage,
        );
      } catch (error) {
        if (
          error instanceof InvalidAdaptationError
          && process.env.NODE_ENV === "development"
        ) {
          console.error("Puter returned an invalid adaptation response.", {
            response: generatedText,
          });
        }
        throw error;
      }
    } catch (error) {
      setGenerationMessage(getGenerationErrorMessage(error));
    } finally {
      setIsPending(false);
    }
  }, [
    effectiveTargetLanguage,
    hasHydrated,
    isLoadingSavedMaterial,
    isOverWordLimit,
    isPending,
    requireAuthToken,
    result,
    resultLanguage,
    setResult,
    text,
  ]);

  return { generate, generationMessage, isPending };
}
