/**
 * Counting characters the way a person counts them.
 *
 * Three different answers exist for "how long is 🏋️":
 *
 *   "🏋️".length          → 3  (UTF-16 code units — what JavaScript means)
 *   [..."🏋️"].length     → 2  (code points — what Postgres `length()` means)
 *   graphemeCount("🏋️")  → 1  (what you see, and the only one worth showing)
 *
 * The gap is not exotic. A weightlifter is a base emoji plus a variation
 * selector; a family is four people joined by zero-width joiners; a flag is two
 * regional indicators; "é" typed on a Mac may be an "e" plus a combining
 * accent. Every one of those is one thing on screen and more than one thing to
 * `.length`, so a validator built on `.length` tells the user their single
 * emoji is three characters long. That's not a rounding error — it's the
 * validator lying about something the user can see with their own eyes.
 *
 * `Intl.Segmenter` is the browser's own implementation of the Unicode
 * text-segmentation rules, built in since 2022 and available in Node too. There
 * is no dependency here and no regex worth writing.
 *
 * Nothing in this file imports anything, deliberately. It is used by a Client
 * Component and by a Server Action and by `node --test`, so any import would
 * have to be safe in all three places.
 */

// Built once at module load rather than per call — constructing a Segmenter
// pulls in locale data, and it's the same object every time.
//
// `undefined` for the locale means "whatever this environment's default is",
// and that's correct rather than lazy: grapheme boundaries are essentially
// locale-independent (the one documented exception is a handful of Indic
// clusters), so pinning a locale would be a decision pretending to matter.
const SEGMENTER = new Intl.Segmenter(undefined, { granularity: "grapheme" });

/** How many characters a person would say this is. */
export function graphemeCount(value: string): number {
  return [...SEGMENTER.segment(value)].length;
}

/**
 * The first character a person would point at, whole.
 *
 * Used for two unrelated things that turn out to be the same problem: the
 * initial in the account menu when there's no avatar image, and trimming a
 * sticker mark down to one. `value[0]` would slice an emoji in half and render
 * the replacement glyph — half a surrogate pair is not a character.
 */
export function firstGrapheme(value: string): string {
  if (!value) return "";
  const [first] = SEGMENTER.segment(value);
  return first?.segment ?? "";
}
