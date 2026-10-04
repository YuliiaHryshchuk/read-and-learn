import {
  InvalidAdaptationError,
  splitIntoFragments,
  type AdaptedFragment,
  type SourceFragment,
  type StructuredAdaptationResult,
} from "./adaptation";

type TextToken = {
  value: string;
  start: number;
  end: number;
};

type PlannedFragment = SourceFragment & {
  reused?: AdaptedFragment;
};

export type IncrementalAdaptationPlan = {
  sourceText: string;
  fragments: PlannedFragment[];
  fragmentsToProcess: SourceFragment[];
};

const TOKEN_PATTERN = /[\p{L}\p{M}\p{N}]+|[^\s]/gu;
const SENTENCE_END = /[.!?](?:["'»”’\)\}\]]+)?$/u;

function tokenize(text: string): TextToken[] {
  return Array.from(text.matchAll(TOKEN_PATTERN), (match) => ({
    value: match[0],
    start: match.index,
    end: match.index + match[0].length,
  }));
}

function findFragmentRanges(sourceText: string, fragments: AdaptedFragment[]) {
  let cursor = 0;
  return fragments.map((fragment) => {
    const start = sourceText.indexOf(fragment.text, cursor);
    if (start < 0 || /\S/u.test(sourceText.slice(cursor, start))) {
      throw new InvalidAdaptationError();
    }

    const range = { start, end: start + fragment.text.length };
    cursor = range.end;
    return range;
  });
}

function matchTokens(oldTokens: TextToken[], newTokens: TextToken[]) {
  const columns = newTokens.length + 1;
  const table = new Uint16Array((oldTokens.length + 1) * columns);

  for (let oldIndex = oldTokens.length - 1; oldIndex >= 0; oldIndex -= 1) {
    for (let newIndex = newTokens.length - 1; newIndex >= 0; newIndex -= 1) {
      const index = oldIndex * columns + newIndex;
      table[index] = oldTokens[oldIndex].value === newTokens[newIndex].value
        ? table[(oldIndex + 1) * columns + newIndex + 1] + 1
        : Math.max(
            table[(oldIndex + 1) * columns + newIndex],
            table[oldIndex * columns + newIndex + 1],
          );
    }
  }

  const oldToNew = new Map<number, number>();
  let oldIndex = 0;
  let newIndex = 0;
  while (oldIndex < oldTokens.length && newIndex < newTokens.length) {
    if (oldTokens[oldIndex].value === newTokens[newIndex].value) {
      oldToNew.set(oldIndex, newIndex);
      oldIndex += 1;
      newIndex += 1;
    } else if (
      table[(oldIndex + 1) * columns + newIndex]
      >= table[oldIndex * columns + newIndex + 1]
    ) {
      oldIndex += 1;
    } else {
      newIndex += 1;
    }
  }

  return oldToNew;
}

function endsSentence(text: string) {
  return SENTENCE_END.test(text.trim());
}

function keepOnlySafeInsertionAnchors(
  sourceText: string,
  anchors: Array<{
    start: number;
    end: number;
    fragment: AdaptedFragment;
    fragmentIndex: number;
  }>,
  fragmentCount: number,
) {
  let safeAnchors = anchors;

  // An insertion directly on an old fragment boundary is ambiguous: a single
  // added word may belong to either neighbouring fragment even though every
  // old token still matches. Only a complete sentence is safe to treat as a
  // new independent fragment. Otherwise include the neighbouring old
  // fragment(s) in the region sent back to the model.
  while (safeAnchors.length > 0) {
    const unsafeIndexes = new Set<number>();

    const first = safeAnchors[0];
    if (
      first.fragmentIndex === 0
      && tokenize(sourceText.slice(0, first.start)).length > 0
      && !endsSentence(sourceText.slice(0, first.start))
    ) {
      unsafeIndexes.add(0);
    }

    for (let index = 0; index < safeAnchors.length - 1; index += 1) {
      const previous = safeAnchors[index];
      const next = safeAnchors[index + 1];

      // If an old fragment is already missing between these anchors, the gap
      // already contains that entire changed fragment and needs no expansion.
      if (next.fragmentIndex !== previous.fragmentIndex + 1) continue;

      const insertedText = sourceText.slice(previous.end, next.start);
      if (tokenize(insertedText).length === 0) continue;

      const isIndependentSentence = endsSentence(previous.fragment.text)
        && endsSentence(insertedText);
      if (!isIndependentSentence) {
        unsafeIndexes.add(index);
        unsafeIndexes.add(index + 1);
      }
    }

    const lastIndex = safeAnchors.length - 1;
    const last = safeAnchors[lastIndex];
    const trailingText = sourceText.slice(last.end);
    if (
      last.fragmentIndex === fragmentCount - 1
      && tokenize(trailingText).length > 0
      && !(endsSentence(last.fragment.text) && endsSentence(trailingText))
    ) {
      unsafeIndexes.add(lastIndex);
    }

    if (unsafeIndexes.size === 0) return safeAnchors;
    safeAnchors = safeAnchors.filter((_, index) => !unsafeIndexes.has(index));
  }

  return safeAnchors;
}

export function planIncrementalAdaptation(
  sourceText: string,
  previousResult: StructuredAdaptationResult,
): IncrementalAdaptationPlan {
  const oldTokens = tokenize(previousResult.sourceText);
  const newTokens = tokenize(sourceText);
  const oldToNew = matchTokens(oldTokens, newTokens);
  const oldFragmentRanges = findFragmentRanges(
    previousResult.sourceText,
    previousResult.fragments,
  );

  const candidateAnchors: Array<{
    start: number;
    end: number;
    fragment: AdaptedFragment;
    fragmentIndex: number;
  }> = [];

  previousResult.fragments.forEach((fragment, fragmentIndex) => {
    const range = oldFragmentRanges[fragmentIndex];
    const tokenIndexes: number[] = [];
    oldTokens.forEach((token, tokenIndex) => {
      if (token.start >= range.start && token.end <= range.end) {
        tokenIndexes.push(tokenIndex);
      }
    });
    if (tokenIndexes.length === 0) return;

    const mappedIndexes = tokenIndexes.map((tokenIndex) => oldToNew.get(tokenIndex));
    if (mappedIndexes.some((tokenIndex) => tokenIndex === undefined)) return;

    const newIndexes = mappedIndexes as number[];
    const isConsecutive = newIndexes.every(
      (tokenIndex, index) => index === 0 || tokenIndex === newIndexes[index - 1] + 1,
    );
    if (!isConsecutive) return;

    const firstToken = newTokens[newIndexes[0]];
    const lastToken = newTokens[newIndexes.at(-1)!];
    candidateAnchors.push({
      start: firstToken.start,
      end: lastToken.end,
      fragment,
      fragmentIndex,
    });
  });

  const anchors = keepOnlySafeInsertionAnchors(
    sourceText,
    candidateAnchors,
    previousResult.fragments.length,
  );

  const planned: PlannedFragment[] = [];
  let cursor = 0;

  function addChangedRegion(start: number, end: number) {
    const region = sourceText.slice(start, end);
    for (const fragment of splitIntoFragments(region)) {
      planned.push({
        id: "",
        text: fragment.text,
      });
    }
  }

  for (const anchor of anchors) {
    addChangedRegion(cursor, anchor.start);
    planned.push({
      id: "",
      text: sourceText.slice(anchor.start, anchor.end),
      reused: anchor.fragment,
    });
    cursor = anchor.end;
  }
  addChangedRegion(cursor, sourceText.length);

  const fragments = planned.map((fragment, index) => ({
    ...fragment,
    id: `fragment-${index + 1}`,
  }));
  const fragmentsToProcess = fragments
    .filter((fragment) => !fragment.reused)
    .map(({ id, text }) => ({ id, text }));

  return {
    sourceText,
    fragments,
    fragmentsToProcess,
  };
}

export function isAdaptationOutdated(
  sourceText: string,
  previousResult: StructuredAdaptationResult,
) {
  const plan = planIncrementalAdaptation(sourceText, previousResult);
  if (plan.fragmentsToProcess.length > 0) return true;

  const previousTokens = tokenize(previousResult.sourceText);
  const currentTokens = tokenize(sourceText);
  return previousTokens.length !== currentTokens.length
    || previousTokens.some(
      (token, index) => token.value !== currentTokens[index]?.value,
    );
}

export function mergeIncrementalAdaptation(
  plan: IncrementalAdaptationPlan,
  processedFragments: AdaptedFragment[],
): StructuredAdaptationResult {
  const processedById = new Map(
    processedFragments.map((fragment) => [fragment.id, fragment]),
  );

  const fragments = plan.fragments.map((fragment) => {
    if (fragment.reused) {
      return {
        ...fragment.reused,
        id: fragment.id,
        text: fragment.text,
      };
    }

    const processed = processedById.get(fragment.id);
    if (!processed || processed.text !== fragment.text) {
      throw new InvalidAdaptationError();
    }
    return processed;
  });

  if (processedById.size !== plan.fragmentsToProcess.length) {
    throw new InvalidAdaptationError();
  }

  return {
    kind: "structured",
    sourceText: plan.sourceText,
    fragments,
  };
}
