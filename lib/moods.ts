/** The five moods, in the order the picker shows them. Matches the CHECK
 *  constraint on day_moods.mood — if these ever disagree, the database wins. */
export const MOODS = ["great", "good", "okay", "low", "rough"] as const;

export type Mood = (typeof MOODS)[number];

export const MOOD_LABEL: Record<Mood, string> = {
  great: "Great",
  good: "Good",
  okay: "Okay",
  low: "Low",
  rough: "Rough",
};

/**
 * The mouth, drawn on a 24×24 grid inside a ring of radius 9. Deep smile down
 * to deep frown — the shape alone carries the meaning, which is what lets the
 * face drop its colour entirely and still say five different things.
 */
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
