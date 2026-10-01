const PUNCTUATION = /\p{P}/gu;
const WORD_CHARACTER = /[\p{L}\p{M}\p{N}]/u;

/**
 * Counts words separated by whitespace or punctuation. A regular hyphen is
 * retained, so a hyphenated form such as "treinta-y-tres" counts as one word.
 */
export function countWords(text: string) {
  const words = text
    .replace(PUNCTUATION, (character) => character === "-" ? character : " ")
    .trim()
    .split(/\s+/u);

  return words.filter((word) => WORD_CHARACTER.test(word)).length;
}
