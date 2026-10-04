import type { StructuredAdaptationResult } from "@/lib/adaptation";

export function makeAdaptation(
  sourceText = "Hola mundo. Adiós mundo.",
): StructuredAdaptationResult {
  const texts = sourceText === "Hola mundo. Adiós mundo."
    ? ["Hola mundo.", "Adiós mundo."]
    : [sourceText];

  return {
    kind: "structured",
    sourceText,
    fragments: texts.map((text, index) => ({
      id: `fragment-${index + 1}`,
      text,
      translation: `Translation ${index + 1}`,
      explanation: index === 0 ? "hola — hello" : "",
    })),
  };
}
