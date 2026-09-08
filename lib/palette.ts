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
/*
 * `tint` is the third rung, and it is the sticker's fill and nothing else —
 * `StickerMark` and the mark field that previews it are its only two callers.
 * It arrived as the pale half of a fill-plus-ring pair; the ring is gone and
 * the rung moved up to 45% to carry the hue on its own, which is why it is
 * written as a `color-mix` on a single `--sticker-fill` percentage rather than
 * as twelve hex values. Turn that one number and both themes follow.
 *
 * There is deliberately no `border` beside it any more. A saturated 1px ring is
 * exactly what this step removed, and leaving `border-ramp-*` in this map is an
 * invitation to put it back one component at a time. Same argument as the
 * missing saturated `fill`/`stroke` above: the rule holds because the class
 * does not exist, not because someone remembers it.
 */
export const RAMP = {
  red: { bg: "bg-ramp-red", soft: "bg-ramp-red-soft", lit: "bg-ramp-red-soft/35", tint: "bg-ramp-red-tint", text: "text-ramp-red", softFill: "fill-ramp-red-soft", softStroke: "stroke-ramp-red-soft" },
  blue: { bg: "bg-ramp-blue", soft: "bg-ramp-blue-soft", lit: "bg-ramp-blue-soft/35", tint: "bg-ramp-blue-tint", text: "text-ramp-blue", softFill: "fill-ramp-blue-soft", softStroke: "stroke-ramp-blue-soft" },
  orange: { bg: "bg-ramp-orange", soft: "bg-ramp-orange-soft", lit: "bg-ramp-orange-soft/35", tint: "bg-ramp-orange-tint", text: "text-ramp-orange", softFill: "fill-ramp-orange-soft", softStroke: "stroke-ramp-orange-soft" },
  yellow: { bg: "bg-ramp-yellow", soft: "bg-ramp-yellow-soft", lit: "bg-ramp-yellow-soft/35", tint: "bg-ramp-yellow-tint", text: "text-ramp-yellow", softFill: "fill-ramp-yellow-soft", softStroke: "stroke-ramp-yellow-soft" },
  green: { bg: "bg-ramp-green", soft: "bg-ramp-green-soft", lit: "bg-ramp-green-soft/35", tint: "bg-ramp-green-tint", text: "text-ramp-green", softFill: "fill-ramp-green-soft", softStroke: "stroke-ramp-green-soft" },
  purple: { bg: "bg-ramp-purple", soft: "bg-ramp-purple-soft", lit: "bg-ramp-purple-soft/35", tint: "bg-ramp-purple-tint", text: "text-ramp-purple", softFill: "fill-ramp-purple-soft", softStroke: "stroke-ramp-purple-soft" },
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
 * **It is `soft` at 35%, not `soft`, and the alpha is doing real work.** A
 * highlight always has the marks it is pointing at sitting on top of it, and
 * those marks are now filled in the same hue at 45%. Opaque `soft` is 48% of
 * that same hue, so a lit Tuesday and the sticker that lit it landed within
 * 1.06:1 of each other — the sticker disappeared into the evidence for itself.
 *
 * 35% is not a taste call, it is the number that puts the separation back where
 * it was when the fill was 20% and this was opaque: 1.19–1.53 across the six in
 * light, 1.46–1.90 in dark, against 1.19–1.52 and 1.41–1.90 before. Yellow is
 * the floor in both eras, which is what you would expect from the palest hue.
 *
 * `null` means ink, which is what a mood gets. Moods are drawn as plain
 * outlines everywhere in this app precisely so they never compete with the six
 * area hues, and giving them one here would undo that. Ink at low opacity is
 * one declaration that lands correctly in both themes.
 */
export function wash(colorKey: string | null): string {
  return colorKey ? ramp(colorKey).lit : "bg-ink/10";
}
