export const PUTER_AI_CONFIG = {
  model: "gpt-5.4-mini",
  provider: "azure-openai-responses",
  reasoningEffort: "minimal",
  normalize: true,
  schemaName: "read_and_learn_adaptation",
  testMode:
    process.env.NODE_ENV === "development"
    && process.env.NEXT_PUBLIC_PUTER_AI_TEST_MODE === "true",
} as const;
