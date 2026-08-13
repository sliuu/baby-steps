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
  red: { bg: "bg-ramp-red", text: "text-ramp-red", border: "border-ramp-red" },
  blue: { bg: "bg-ramp-blue", text: "text-ramp-blue", border: "border-ramp-blue" },
  orange: { bg: "bg-ramp-orange", text: "text-ramp-orange", border: "border-ramp-orange" },
  yellow: { bg: "bg-ramp-yellow", text: "text-ramp-yellow", border: "border-ramp-yellow" },
  green: { bg: "bg-ramp-green", text: "text-ramp-green", border: "border-ramp-green" },
  purple: { bg: "bg-ramp-purple", text: "text-ramp-purple", border: "border-ramp-purple" },
} as const;

export type RampKey = keyof typeof RAMP;

const FALLBACK: RampKey = "blue";

/** A colour_key from the database is a string, so it might not be a real ramp. */
export function ramp(colorKey: string) {
  return RAMP[colorKey as RampKey] ?? RAMP[FALLBACK];
}
