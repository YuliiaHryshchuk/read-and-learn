import type { SourceFragment } from "@/lib/adaptation";
import type { PuterAIMessage } from "@/lib/ai/puterAdapter";
import {
  LANGUAGE_EXAMPLES,
  SYSTEM_INSTRUCTION_TEMPLATE,
} from "@/lib/ai/adaptationPromptText";

const INCLUDE_LANGUAGE_EXAMPLES = false;

function buildSystemInstruction(language: string) {
  const languageExample = INCLUDE_LANGUAGE_EXAMPLES
    ? LANGUAGE_EXAMPLES[language.trim().toLocaleLowerCase("en-US")] ?? ""
    : "";

  return SYSTEM_INSTRUCTION_TEMPLATE.replaceAll(
    "{{TARGET_LANGUAGE}}",
    JSON.stringify(language),
  ).replace("{{LANGUAGE_EXAMPLE}}", languageExample);
}

export function buildAdaptationMessages(
  fragments: SourceFragment[],
  language: string,
): PuterAIMessage[] {
  return [
    { role: "system", content: buildSystemInstruction(language) },
    {
      role: "user",
      content: JSON.stringify({ language, fragments }),
    },
  ];
}
