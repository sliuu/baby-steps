// Geometry shared by the Trends charts. No imports (see `lib/analytics.ts` re node --test).

export type Point = { x: number; y: number };

/** Twelve o'clock in radians (SVG angle 0 points east). */
export const TOP = -Math.PI / 2;

/**
 * Radial chart box in viewBox units. Width budgets the longest label at 3/9
 * o'clock (SVG clips, never reflows): 2·(radius+LABEL_GAP) + 2·~103 ≈ 458, +slack.
 * Height: 2·(radius + gap + 2·LINE).
 */
export const VIEW = {
  width: 520,
  height: 320,
  cx: 260,
  cy: 160,
  /** Outer extent; other radii are fractions of it. */
  radius: 110,
} as const;

/** Label line height in viewBox units; only `VIEW.height`'s budget uses it now. */
export const LINE = 14;

/** Gap past the outer ring for labels, viewBox units. */
export const LABEL_GAP = 16;

/** cos(-π/2) isn't exactly 0, so compare against this, not 0. */
const EPSILON = 1e-9;

/** Round to 2dp for markup. Doesn't round `.005` ties up (binary floats). */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Polar → Cartesian. Angle 0 is east and y grows down, so angles sweep clockwise. */
export function polar(
  cx: number,
  cy: number,
  radius: number,
  angle: number,
): Point {
  return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
}

/**
 * Counts as fractions of the max (shape shows balance, not size). All zeros →
 * zeros, not NaN, which would make SVG drop the shape.
 */
export function normalize(counts: readonly number[]): number[] {
  // Leading 0: `Math.max()` of nothing is -Infinity.
  const max = Math.max(0, ...counts);
  if (max === 0) return counts.map(() => 0);
  return counts.map((count) => count / max);
}

/** Right side grows right, left grows left, top/bottom straddle. */
export function labelAnchor(angle: number): "start" | "middle" | "end" {
  const cos = Math.cos(angle);
  if (Math.abs(cos) < EPSILON) return "middle";
  return cos > 0 ? "start" : "end";
}

/** Only labels on the vertical axis are pushed above/below; others centre. */
export function labelBaseline(angle: number): "auto" | "middle" | "hanging" {
  if (Math.abs(Math.cos(angle)) > EPSILON) return "middle";
  return Math.sin(angle) < 0 ? "auto" : "hanging";
}
