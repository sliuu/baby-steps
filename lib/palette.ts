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
/*
 * `softFill` and `softStroke` are the SVG halves of `soft`, and none of the
 * three is interchangeable with the others. An SVG shape takes its colour from
 * `fill` and its outline from `stroke`; `background-color` does nothing to a
 * `<circle>`. So the Life Star's vertex dots need their own class per hue and
 * the donut's segments need another — a donut segment is a *stroked* circle, so
 * it has no fill at all. Same six colours, three properties, all written out for
 * the same reason the rest of this map is.
 *
 * They are the pastel end, and there is deliberately no saturated `fill` or
 * `stroke` beside them. Step 14 ended with one rule — every chart wears the same
 * tint the calendar does — and a rule you can only keep by remembering it is not
 * a rule. Deleting the classes is what makes it hold: there is now no way to
 * paint an SVG in a full-strength hue without adding one back, which is a change
 * big enough to notice in review.
 */
export const RAMP = {
  red: { bg: "bg-ramp-red", soft: "bg-ramp-red-soft", text: "text-ramp-red", border: "border-ramp-red", softFill: "fill-ramp-red-soft", softStroke: "stroke-ramp-red-soft" },
  blue: { bg: "bg-ramp-blue", soft: "bg-ramp-blue-soft", text: "text-ramp-blue", border: "border-ramp-blue", softFill: "fill-ramp-blue-soft", softStroke: "stroke-ramp-blue-soft" },
  orange: { bg: "bg-ramp-orange", soft: "bg-ramp-orange-soft", text: "text-ramp-orange", border: "border-ramp-orange", softFill: "fill-ramp-orange-soft", softStroke: "stroke-ramp-orange-soft" },
  yellow: { bg: "bg-ramp-yellow", soft: "bg-ramp-yellow-soft", text: "text-ramp-yellow", border: "border-ramp-yellow", softFill: "fill-ramp-yellow-soft", softStroke: "stroke-ramp-yellow-soft" },
  green: { bg: "bg-ramp-green", soft: "bg-ramp-green-soft", text: "text-ramp-green", border: "border-ramp-green", softFill: "fill-ramp-green-soft", softStroke: "stroke-ramp-green-soft" },
  purple: { bg: "bg-ramp-purple", soft: "bg-ramp-purple-soft", text: "text-ramp-purple", border: "border-ramp-purple", softFill: "fill-ramp-purple-soft", softStroke: "stroke-ramp-purple-soft" },
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
