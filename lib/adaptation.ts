export type SourceFragment = {
  id: string;
  text: string;
};

export type ExplanationItem = {
  term: string;
  meaning: string;
};

export type AdaptedFragment = SourceFragment & {
  translation: string;
  explanation: string;
};

export type StructuredAdaptationResult = {
  kind: "structured";
  sourceText: string;
  fragments: AdaptedFragment[];
};

export type RawAdaptationResult = {
  kind: "raw";
  sourceText: string;
  content: string;
};

export type AdaptationResult = StructuredAdaptationResult | RawAdaptationResult;

const MAX_TRANSLATION_LENGTH = 4_000;
const MAX_EXPLANATION_LENGTH = 20_000;
const MIN_FRAGMENT_WORDS = 5;
const MAX_FRAGMENT_WORDS = 50;
const SENTENCE_END = /[.!?](?:["'»”’\)\}\]]+)?$/u;

export class InvalidAdaptationError extends Error {
  constructor() {
    super("The AI response did not match the required adaptation format.");
    this.name = "InvalidAdaptationError";
  }
}

export function splitIntoFragments(sourceText: string): SourceFragment[] {
  const words = Array.from(sourceText.matchAll(/\S+/gu), (match) => ({
    start: match.index,
    end: match.index + match[0].length,
    endsSentence: SENTENCE_END.test(match[0]),
  }));
  if (words.length === 0) return [];

  const ranges: Array<{ start: number; end: number }> = [];
  let start = 0;

  while (start < words.length) {
    const remaining = words.length - start;
    if (remaining <= MAX_FRAGMENT_WORDS) {
      ranges.push({ start, end: words.length - 1 });
      break;
    }

    const latestEnd = start + MAX_FRAGMENT_WORDS - 1;
    let sentenceEnd = -1;

    for (let end = start + MIN_FRAGMENT_WORDS - 1; end <= latestEnd; end += 1) {
      const wordsAfter = words.length - end - 1;
      if (
        words[end].endsSentence
        && (wordsAfter === 0 || wordsAfter >= MIN_FRAGMENT_WORDS)
      ) {
        sentenceEnd = end;
      }
    }

    if (sentenceEnd >= 0) {
      ranges.push({ start, end: sentenceEnd });
      start = sentenceEnd + 1;
      continue;
    }

    // No usable sentence boundary exists within 50 words. This covers a
    // single very long sentence and rare cases where a boundary would leave a
    // trailing fragment shorter than five words. Rebalance the hard split so
    // the final fragment can still meet the minimum whenever possible.
    const defaultRemainder = remaining - MAX_FRAGMENT_WORDS;
    const chunkSize = defaultRemainder > 0 && defaultRemainder < MIN_FRAGMENT_WORDS
      ? MAX_FRAGMENT_WORDS - (MIN_FRAGMENT_WORDS - defaultRemainder)
      : MAX_FRAGMENT_WORDS;
    const end = start + chunkSize - 1;
    ranges.push({ start, end });
    start = end + 1;
  }

  return ranges.map((range, index) => ({
    id: `fragment-${index + 1}`,
    text: sourceText.slice(words[range.start].start, words[range.end].end),
  }));
}

export function createAdaptationSchema(fragments: SourceFragment[], language: string) {
  const fragmentSchema = {
    type: "object",
    properties: {
      translation: {
        type: "string",
        description: `A natural translation written entirely in ${language}.`,
      },
      explanation: {
        type: "string",
        description: `Study explanations written entirely in ${language}, except for quoted source terms, Spanish lemmas, and Spanish grammatical names. Connector words that relate a verb form to its infinitive and all grammatical prose must also be in ${language}.`,
      },
    },
    required: ["translation", "explanation"],
    additionalProperties: false,
  } as const;

  return {
    type: "object",
    properties: Object.fromEntries(
      fragments.map(({ id }) => [id, fragmentSchema]),
    ),
    required: fragments.map(({ id }) => id),
    additionalProperties: false,
  } as const;
}

function hasOnlyKeys(value: Record<string, unknown>, keys: string[]) {
  const actualKeys = Object.keys(value);
  return actualKeys.length === keys.length && keys.every((key) => actualKeys.includes(key));
}

function normalizeModelObjectKeys(value: Record<string, unknown>) {
  const normalized: Record<string, unknown> = {};

  for (const [key, item] of Object.entries(value)) {
    // Models occasionally insert invisible formatting characters such as a
    // soft hyphen into an otherwise valid schema key (`mean\u00ading`).
    const normalizedKey = key.replace(/\p{Cf}/gu, "");
    if (Object.hasOwn(normalized, normalizedKey)) return null;
    normalized[normalizedKey] = item;
  }

  return normalized;
}

function isBoundedString(value: unknown, maxLength: number, allowEmpty = false): value is string {
  return typeof value === "string"
    && value.length <= maxLength
    && (allowEmpty || value.trim().length > 0);
}

export function parseExplanationItems(explanation: string): ExplanationItem[] {
  const segments = explanation
    .trim()
    .split(/\r?\n+|(?<=[.!?;])\s+(?=[^.!?;\n]{1,200}\s+—\s)/u)
    .map((segment) => segment.trim())
    .filter(Boolean);

  const items: ExplanationItem[] = [];
  for (const segment of segments) {
    const separator = segment.indexOf(" — ");
    if (separator < 1) {
      const previous = items.at(-1);
      if (previous) previous.meaning = `${previous.meaning} ${segment}`;
      else items.push({ term: "", meaning: segment });
      continue;
    }

    items.push({
      term: segment.slice(0, separator).trim(),
      meaning: segment.slice(separator + 3).trim(),
    });
  }

  return items;
}

export function parseModelAdaptation(
  content: string,
  sourceText: string,
  sourceFragments: SourceFragment[],
): AdaptationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new InvalidAdaptationError();
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new InvalidAdaptationError();
  }

  const root = normalizeModelObjectKeys(parsed as Record<string, unknown>);
  if (!root) throw new InvalidAdaptationError();
  const expectedIds = sourceFragments.map(({ id }) => id);
  if (!hasOnlyKeys(root, expectedIds)) {
    throw new InvalidAdaptationError();
  }

  return {
    kind: "structured",
    sourceText,
    fragments: sourceFragments.map((sourceFragment) => {
      const value = root[sourceFragment.id];
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new InvalidAdaptationError();
      }

      const modelFragment = normalizeModelObjectKeys(value as Record<string, unknown>);
      if (!modelFragment || !hasOnlyKeys(modelFragment, ["translation", "explanation"])) {
        throw new InvalidAdaptationError();
      }
      if (!isBoundedString(modelFragment.translation, MAX_TRANSLATION_LENGTH)) {
        throw new InvalidAdaptationError();
      }
      if (!isBoundedString(modelFragment.explanation, MAX_EXPLANATION_LENGTH, true)) {
        throw new InvalidAdaptationError();
      }

      return {
        ...sourceFragment,
        translation: modelFragment.translation,
        explanation: modelFragment.explanation,
      };
    }),
  };
}

export function createRawAdaptation(sourceText: string, content: string): RawAdaptationResult {
  return {
    kind: "raw",
    sourceText,
    content,
  };
}

export function isAdaptationResult(value: unknown): value is AdaptationResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const result = value as Record<string, unknown>;
  if (result.kind === "raw") {
    return hasOnlyKeys(result, ["kind", "sourceText", "content"])
      && typeof result.sourceText === "string"
      && isBoundedString(result.content, 100_000);
  }

  if (result.kind !== "structured") return false;
  if (!hasOnlyKeys(result, ["kind", "sourceText", "fragments"])) return false;
  if (typeof result.sourceText !== "string" || !Array.isArray(result.fragments)) return false;

  const sourceFragments = splitIntoFragments(result.sourceText);
  if (result.fragments.length !== sourceFragments.length) return false;

  return result.fragments.every((value, index) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const fragment = value as Record<string, unknown>;
    if (!hasOnlyKeys(fragment, ["id", "text", "translation", "explanation"])) return false;
    if (fragment.id !== sourceFragments[index].id || fragment.text !== sourceFragments[index].text) return false;
    if (!isBoundedString(fragment.translation, MAX_TRANSLATION_LENGTH)) return false;
    return isBoundedString(fragment.explanation, MAX_EXPLANATION_LENGTH, true);
  });
}
