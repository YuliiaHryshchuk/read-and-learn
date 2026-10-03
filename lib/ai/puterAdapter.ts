import { getPuterClient } from "@/lib/puterClient";
import { PUTER_AI_CONFIG } from "@/lib/ai/puterConfig";

export type PuterAIMessage = {
  role: "system" | "user";
  content: string;
};

type StructuredOutputRequest = {
  messages: PuterAIMessage[];
  schema: object;
};

export class PuterAIGenerationLimitError extends Error {
  constructor() {
    super(
      "Puter exhausted the generation limit before completing the response.",
    );
    this.name = "PuterAIGenerationLimitError";
  }
}

export class PuterAIResponseError extends Error {
  constructor() {
    super("Puter returned an empty or invalid response.");
    this.name = "PuterAIResponseError";
  }
}

export async function requestPuterStructuredOutput({
  messages,
  schema,
}: StructuredOutputRequest) {
  const puter = await getPuterClient();
  const response = await puter.ai.chat(
    messages,
    {
      model: PUTER_AI_CONFIG.model,
      provider: PUTER_AI_CONFIG.provider,
      reasoning_effort: PUTER_AI_CONFIG.reasoningEffort,
      normalize: PUTER_AI_CONFIG.normalize,
      // Puter.js forwards `text` to the pinned OpenAI Responses provider, but
      // its public type currently exposes only `verbosity` on this property.
      text: {
        format: {
          type: "json_schema",
          name: PUTER_AI_CONFIG.schemaName,
          strict: true,
          schema,
        },
      } as unknown as { verbosity: string },
    },
    PUTER_AI_CONFIG.testMode,
  );

  if (response.finish_reason === "length") {
    throw new PuterAIGenerationLimitError();
  }

  const content = response.message?.content;
  if (typeof content !== "string" || !content) {
    throw new PuterAIResponseError();
  }

  return content;
}
