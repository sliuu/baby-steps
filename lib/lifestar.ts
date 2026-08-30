/**
 * The geometry behind the Life Star.
 *
 * No imports, same rule as `lib/analytics.ts` and for the same reason:
 * `lib/lifestar.test.ts` runs this under `node --test`, where nothing resolves
 * `@/` — that alias belongs to the bundler. Nothing here needs one anyway.
 *
 * The trigonometry lives here rather than inside the component because a
 * number can be checked and a drawing can only be looked at. Every decision
 * below — where spoke 0 points, what the radius is a share *of*, which side of
 * a label its text hangs from — is a value some test can pin, and each one has
 * a wrong answer that renders as a plausible-looking chart.
 */

export type Point = { x: number; y: number };

/**
 * The chart's coordinate system, in `viewBox` units rather than pixels.
 *
 * This is what `viewBox` buys: the numbers below are a made-up grid, and the
 * browser scales the whole drawing to whatever width the card gives it. So
 * "92" is not 92 pixels — it's 92 of the 460 across, and it stays that
 * proportion at any size. Nothing here needs to know how wide the card is.
 *
 * Wider than tall on purpose, and the width is a calculation rather than a
 * guess at a nice number. The labels sit *outside* the outer ring, and with six
 * spokes starting at the top the four side labels come off at 30° from
 * horizontal — so "Romance & Adventure · 42" reaches much further left and
 * right than anything reaches up or down. SVG does not measure text and cannot
 * reflow it, and the root `<svg>` clips at the viewBox edge, so a name that
 * doesn't fit is a name with its last few letters sliced off.
 *
 * The budget, for the longest label the seed data produces (24 characters at
 * 12 units, and EB Garamond averages about 0.45em per character, so ~130
 * units):
 *
 *     width ≥ 2·(radius + LABEL_GAP)·cos(30°) + 2·textWidth
 *           ≥ 2·126·0.866 + 260  ≈ 478
 *
 * 520 leaves ~20 units of slack each side. The character-width figure is an
 * estimate — there is no way to measure a font from Node — so the slack is the
 * point, and a genuinely long area name is still worth checking on screen.
 * Height is set by the top and bottom labels: `2·(radius + gap + line)`.
 */
export const VIEW = {
  width: 520,
  height: 300,
  cx: 260,
  cy: 150,
  /** The 100% ring. Every other radius is a fraction of this. */
  radius: 110,
} as const;

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

/** How far past the outer ring a label sits, in the same viewBox units. */
export const LABEL_GAP = 16;

/**
 * Anything below this counts as zero.
 *
 * Not decoration. `Math.cos(-Math.PI / 2)` is `6.123233995736766e-17`, not `0`,
 * because π/2 is not exactly representable in binary floating point — so the
 * top vertex, which is straight up and whose label obviously belongs centred,
 * has a *positive* cosine and a naive `cos > 0` anchors its text as if it were
 * off to the right. The label then hangs a name's width to one side of a spoke
 * that points at neither side. One constant, and `labelAnchor` is correct at
 * the two places a polygon actually crosses the vertical axis.
 */
const EPSILON = 1e-9;

/**
 * The angle of spoke `i` of `n`, in radians.
 *
 * `(2π / n) · i` — the whole "write it for N, not 6" rule in one expression.
 * Nothing here knows the app has six life areas; hand it seven and it draws
 * seven spokes 51.4° apart. Hardcoding 60° would cost the same line today and
 * a rewrite of three charts the day an area is added.
 *
 * The `-π/2` is the interesting half. Angle 0 in this system points *east*, not
 * north, and SVG's y axis grows **downward** — so positive angles sweep
 * clockwise, which is the opposite of the maths convention and the source of
 * most upside-down radar charts. Subtracting a quarter turn puts spoke 0 at
 * twelve o'clock and sends the rest round clockwise, which is the order someone
 * reads a list of areas in.
 */
export function spokeAngle(i: number, n: number): number {
  return -Math.PI / 2 + ((2 * Math.PI) / n) * i;
}

/**
 * Polar to Cartesian: the one piece of trigonometry in this project.
 *
 * `x = cx + r·cos(θ)`, `y = cy + r·sin(θ)`. An angle and a distance go in, a
 * point on the canvas comes out — which is exactly the translation a radar
 * chart needs, because "how much of this area" is naturally a distance from the
 * middle and SVG only accepts coordinates.
 *
 * Worked, for the top vertex at the full radius: θ is -π/2, `cos(-π/2)` is 0
 * (to floating point's best effort) and `sin(-π/2)` is -1, so the point is
 * `(260 + 110·0, 150 + 110·-1)` = `(260, 40)` — same x as the centre, 110 units
 * *up* the screen. The minus is what makes it up rather than down.
 */
export function polar(
  cx: number,
  cy: number,
  radius: number,
  angle: number,
): Point {
  return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
}

/**
 * Counts as fractions of the largest count, not of the total.
 *
 * This is the normalizing decision, and it changes what the chart means. Share
 * of the *total* would make the polygon's area a pie: six areas at 20 marks
 * each would draw a small hexagon at 16.7% and the shape would say nothing the
 * number 20 didn't. Share of the *maximum* pins the busiest area to the outer
 * ring and draws every other one relative to it, so the shape is about balance
 * — a lopsided month is a spike and an even one is a regular hexagon,
 * regardless of whether the month held 60 marks or 600.
 *
 * The cost, and it's real: the chart cannot tell you how big a month was. Two
 * ranges with identical proportions and wildly different totals draw the same
 * polygon. That's what the counts in the spoke labels are for — the shape
 * carries the balance, the labels carry the magnitude, and neither is asked to
 * do the other's job.
 *
 * All zeros returns all zeros rather than `NaN`. `0/0` would poison every
 * coordinate downstream and SVG's response to `NaN` in a `points` attribute is
 * to silently drop the shape, so an empty range would render as a missing
 * polygon rather than a collapsed one.
 */
export function normalize(counts: readonly number[]): number[] {
  // The leading 0 is what makes an empty array safe: `Math.max()` with no
  // arguments is -Infinity, and every share would come out as -0.
  const max = Math.max(0, ...counts);
  if (max === 0) return counts.map(() => 0);
  return counts.map((count) => count / max);
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
 *
 * Rounded to two decimals, which is well past the resolution of any screen this
 * renders on and keeps the markup readable — unrounded, `cos(-π/2)` leaves
 * `230.00000000000003` in the DOM, and the difference between that and `230` is
 * roughly a thousandth of an atom.
 */
export function toPoints(points: readonly Point[]): string {
  return points.map((p) => `${round(p.x)},${round(p.y)}`).join(" ");
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Which end of a spoke label attaches to the spoke.
 *
 * Text on the right of the chart should grow rightward (`start`), text on the
 * left should grow leftward (`end`), and text at the very top or bottom should
 * straddle the spoke (`middle`). Get it wrong and every left-hand label runs
 * back across the chart it's labelling.
 *
 * The sign of the cosine answers it, because cosine *is* the horizontal
 * component — see `EPSILON` for why the comparison can't be against a bare 0.
 */
export function labelAnchor(angle: number): "start" | "middle" | "end" {
  const cos = Math.cos(angle);
  if (Math.abs(cos) < EPSILON) return "middle";
  return cos > 0 ? "start" : "end";
}

/**
 * How a spoke label sits vertically against its point.
 *
 * Only the labels on the vertical axis get pushed clear of the chart — the top
 * one sits its baseline on the point so the text is above it (`auto`), the
 * bottom one hangs below (`hanging`). Everything else is centred on its point,
 * because a label out at 30° is already clear horizontally and nudging it
 * vertically as well would leave it visibly unaligned with the spoke it names.
 *
 * So the test is `|cos|`, not `sin`: it asks "is this label on the vertical
 * axis", where `labelAnchor` asks "which side is it on". Same cosine, two
 * different questions.
 */
export function labelBaseline(angle: number): "auto" | "middle" | "hanging" {
  if (Math.abs(Math.cos(angle)) > EPSILON) return "middle";
  return Math.sin(angle) < 0 ? "auto" : "hanging";
}
