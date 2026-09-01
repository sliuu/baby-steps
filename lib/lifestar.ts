/**
 * The geometry that only a radar chart can use.
 *
 * Everything generic — the box, `polar`, `normalize`, the label anchoring, the
 * rounding — moved to `lib/charts.ts` in Step 14, when the donut and the bars
 * became its second and third callers. What's left here is what only a radar
 * chart can use: where its spokes point and where its rings sit.
 *
 * `./charts.ts` is relative and carries its extension, which is the only thing
 * a value import in `lib/` may look like — `lib/lifestar.test.ts` runs this
 * under `node --test`, where the `@/` alias belongs to a bundler that isn't
 * running. Same rule as `lib/stickers.ts` importing `./graphemes.ts`.
 */
import { TOP, polar, round2, type Point } from "./charts.ts";

/**
 * The concentric rings, as fractions of the full radius.
 *
 * Drawn as polygons rather than circles: at 25% a hexagon and a circle are
 * nearly the same shape, but the polygon's corners land exactly on the spokes,
 * so a vertex sitting on a ring visibly sits on it. With circles the star's
 * corners cut across the rings between their own gridlines and reading a value
 * off the chart stops being possible.
 */
export const RINGS = [0.25, 0.5, 0.75, 1] as const;

/**
 * The angle of spoke `i` of `n`, in radians.
 *
 * `(2π / n) · i` — the whole "write it for N, not 6" rule in one expression.
 * Nothing here knows the app has six life areas; hand it seven and it draws
 * seven spokes 51.4° apart. Hardcoding 60° would cost the same line today and
 * a rewrite of three charts the day an area is added.
 *
 * `TOP` puts spoke 0 at twelve o'clock and sends the rest round clockwise,
 * which is the order someone reads a list of areas in. See `polar` in
 * `charts.ts` for why a quarter turn has to be subtracted to get "up".
 */
export function spokeAngle(i: number, n: number): number {
  return TOP + ((2 * Math.PI) / n) * i;
}

/**
 * The `n` corners of a regular polygon — one ring, or the spoke ends.
 */
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

/**
 * The star itself: one point per share, each at its own distance from centre.
 *
 * The only difference from `ringPoints` is that the radius varies per vertex,
 * which is the entire chart. `shares.length` sets the spoke count, so the
 * polygon and the rings agree on the geometry by construction rather than by
 * both being handed a `6`.
 *
 * A share of 0 puts its vertex exactly at the centre. Several zeros put several
 * vertices there and the polygon pinches to a point — correct, and worth
 * knowing it's deliberate rather than a collapse.
 */
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

/**
 * Points to the string SVG's `points` attribute wants: `"x,y x,y …"`.
 */
export function toPoints(points: readonly Point[]): string {
  return points.map((p) => `${round2(p.x)},${round2(p.y)}`).join(" ");
}
