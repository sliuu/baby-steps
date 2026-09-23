/**
 * The exact pastel fill used by stickers for each hue.
 *
 * This is deliberately a dependency-free leaf: both the sticker class map and
 * Node-tested mood analytics can import it without pulling UI-only modules into
 * the test runner. The actual light/dark values remain in globals.css.
 */
export const RAMP_TINT_VALUE = {
  red: "var(--ramp-red-tint)",
  blue: "var(--ramp-blue-tint)",
  orange: "var(--ramp-orange-tint)",
  yellow: "var(--ramp-yellow-tint)",
  green: "var(--ramp-green-tint)",
  purple: "var(--ramp-purple-tint)",
} as const;
