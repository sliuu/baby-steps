/**
 * Grapheme counting: "🏋️" is .length 3, Postgres length() 2, graphemes 1.
 * No imports on purpose: used by client, server action and `node --test`.
 */

// Built once (loads locale data); grapheme rules are ~locale-independent.
const SEGMENTER = new Intl.Segmenter(undefined, { granularity: "grapheme" });

/** How many characters a person would say this is. */
export function graphemeCount(value: string): number {
  return [...SEGMENTER.segment(value)].length;
}

/** First whole grapheme; `value[0]` would split a surrogate pair. */
export function firstGrapheme(value: string): string {
  if (!value) return "";
  const [first] = SEGMENTER.segment(value);
  return first?.segment ?? "";
}
