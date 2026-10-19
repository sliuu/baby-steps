// Radar-only geometry. Relative `.ts` import: lifestar.test.ts runs under node --test.
import { TOP, polar, round2, type Point } from "./charts.ts";

/** Ring fractions; drawn as polygons so vertices sit exactly on spokes. */
export const RINGS = [0.25, 0.5, 0.75, 1] as const;

/** Angle of spoke `i` of `n`, clockwise from twelve o'clock. Works for any n. */
export function spokeAngle(i: number, n: number): number {
  return TOP + ((2 * Math.PI) / n) * i;
}

/** Corners of a regular `n`-gon (a ring, or the spoke ends). */
export function ringPoints(
  n: number,
  radius: number,
  cx: number,
  cy: number,
): Point[] {
  return Array.from({ length: n }, (_, i) =>
    polar(cx, cy, radius, spokeAngle(i, n)),
  );
}

/** One vertex per share; a share of 0 sits at the centre. */
export function starPoints(
  shares: readonly number[],
  radius: number,
  cx: number,
  cy: number,
): Point[] {
  return shares.map((share, i) =>
    polar(cx, cy, radius * share, spokeAngle(i, shares.length)),
  );
}

/** Points → SVG `points` string. */
export function toPoints(points: readonly Point[]): string {
  return points.map((p) => `${round2(p.x)},${round2(p.y)}`).join(" ");
}
