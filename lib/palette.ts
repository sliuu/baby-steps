/**
 * `life_areas.color_key` holds a hue name. This maps it to the classes Tailwind
 * generated from the `--color-ramp-*` tokens in globals.css.
 *
 * The map has to be written out. `bg-ramp-${colorKey}` would be tidier and
 * would produce nothing — Tailwind finds class names by scanning source text,
 * so a name assembled at runtime never appears in the compiled CSS. Same trap
 * as `process.env.NEXT_PUBLIC_…` in Step 3: the tool reads the file, it doesn't
 * run it.
 */
export const RAMP = {
  red: { bg: "bg-ramp-red", soft: "bg-ramp-red-soft", text: "text-ramp-red", border: "border-ramp-red" },
  blue: { bg: "bg-ramp-blue", soft: "bg-ramp-blue-soft", text: "text-ramp-blue", border: "border-ramp-blue" },
  orange: { bg: "bg-ramp-orange", soft: "bg-ramp-orange-soft", text: "text-ramp-orange", border: "border-ramp-orange" },
  yellow: { bg: "bg-ramp-yellow", soft: "bg-ramp-yellow-soft", text: "text-ramp-yellow", border: "border-ramp-yellow" },
  green: { bg: "bg-ramp-green", soft: "bg-ramp-green-soft", text: "text-ramp-green", border: "border-ramp-green" },
  purple: { bg: "bg-ramp-purple", soft: "bg-ramp-purple-soft", text: "text-ramp-purple", border: "border-ramp-purple" },
} as const;

export type RampKey = keyof typeof RAMP;

const FALLBACK: RampKey = "blue";

/** A colour_key from the database is a string, so it might not be a real ramp. */
export function ramp(colorKey: string) {
  return RAMP[colorKey as RampKey] ?? RAMP[FALLBACK];
}

/**
 * The tint a highlighted thing wears: the day cells it lights, its own row in
 * the tray, and the area label above it.
 *
 * One function so those three can't drift — the same argument as `validateDraft`
 * in Step 10, and it's why the tray row you clicked is visibly the same colour
 * as the days that just lit up rather than approximately it.
 *
 * `null` means ink, which is what a mood gets. Moods are drawn as plain
 * outlines everywhere in this app precisely so they never compete with the six
 * area hues, and giving them one here would undo that. Ink at low opacity is
 * one declaration that lands correctly in both themes.
 */
export function wash(colorKey: string | null): string {
  return colorKey ? ramp(colorKey).soft : "bg-ink/10";
}
