/** The five moods, sad → happy (display order). Matches the day_moods.mood CHECK. */
export const MOODS = ["rough", "low", "okay", "good", "great"] as const;

export type Mood = (typeof MOODS)[number];

export const MOOD_LABEL: Record<Mood, string> = {
  great: "Great",
  good: "Good",
  okay: "Okay",
  low: "Low",
  rough: "Rough",
};

/** CSS colour per mood, from the `--mood-*` tokens. */
export const MOOD_COLOR: Record<Mood, string> = {
  rough: "var(--mood-rough)",
  low: "var(--mood-low)",
  okay: "var(--mood-okay)",
  good: "var(--mood-good)",
  great: "var(--mood-great)",
};

/** `bg-mood-*` classes, written out so Tailwind sees them. */
export const MOOD_BG: Record<Mood, string> = {
  rough: "bg-mood-rough",
  low: "bg-mood-low",
  okay: "bg-mood-okay",
  good: "bg-mood-good",
  great: "bg-mood-great",
};

/** Mouth paths on a 24×24 grid (ring r=9); shape alone carries the mood. */
export const MOOD_MOUTH: Record<Mood, string> = {
  great: "M7.5 12.5 Q12 17.5 16.5 12.5",
  good: "M7.5 13 Q12 16 16.5 13",
  okay: "M8 14 L16 14",
  low: "M7.5 15 Q12 12.5 16.5 15",
  rough: "M7.5 15.5 Q12 11 16.5 15.5",
};

/** `mood` arrives from Postgres as a plain string. */
export function isMood(value: string): value is Mood {
  return (MOODS as readonly string[]).includes(value);
}
