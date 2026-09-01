/**
 * The geometry every chart on the Trends page shares.
 *
 * Split out of `lib/lifestar.ts` in Step 14, when the donut arrived and wanted
 * the box, the rounding, the twelve-o'clock start and the label anchoring, and
 * the bars wanted `normalize`. Same rule as `firstGrapheme` moving into
 * `lib/graphemes.ts` in Step 10: it moves when the second caller arrives, not
 * before, and the alternative here was `Donut.tsx` importing from a module
 * named after a different chart.
 *
 * What stayed behind is what only a radar chart can use — `spokeAngle`,
 * `ringPoints`, `starPoints`, `RINGS`. What's here is true of any shape drawn
 * from a tally.
 *
 * No imports, for the `node --test` reason spelled out in `lib/analytics.ts`.
 */

export type Point = { x: number; y: number };

/**
 * The three lenses on one tally, and what the switcher calls them.
 *
 * Same shape as `RANGE_KINDS`/`RANGE_LABEL` in `analytics.ts`, and for the same
 * reason: the list drives the control, so adding a chart is one entry here
 * rather than an entry here plus a button there that someone forgets.
 *
 * "Pie" rather than "Donut" on screen. It is a donut, and nobody outside this
 * file calls it that.
 */
export type ChartKind = "star" | "donut" | "bars";

export const CHART_KINDS: ChartKind[] = ["star", "donut", "bars"];

export const CHART_LABEL: Record<ChartKind, string> = {
  star: "Life Star",
  donut: "Pie",
  bars: "Bars",
};

/**
 * Twelve o'clock, in radians.
 *
 * Angle 0 in SVG points east. Every chart here starts at the top instead —
 * spoke 0 of the star, slice 0 of the donut — so the quarter turn that gets
 * there is written once and named, rather than appearing as a bare `-Math.PI/2`
 * in two files that have to keep agreeing.
 */
export const TOP = -Math.PI / 2;

/**
 * The box both radial charts draw into, in `viewBox` units rather than pixels.
 *
 * This is what `viewBox` buys: the numbers below are a made-up grid, and the
 * browser scales the whole drawing to whatever width the card gives it. So
 * "110" is not 110 pixels — it's 110 of the 520 across, and it stays that
 * proportion at any size. Nothing here needs to know how wide the card is.
 *
 * Shared by the star and the donut on purpose, which is the point worth
 * keeping. They are two lenses on one tally and you flip between them while
 * looking at the page; if the second one drew into a different box, switching
 * would resize the card and jump everything under it. One box means the drawing
 * changes and nothing else moves. The donut's ring is sized so its *outer edge*
 * lands on `radius` too — see `Donut.tsx`.
 *
 * Wider than tall on purpose, and the width is a calculation rather than a
 * guess at a nice number. The labels sit *outside* the outer ring, so
 * "Romance & Adventure" reaches much further left and right than anything
 * reaches up or down. SVG does not measure text and cannot reflow it, and the
 * root `<svg>` clips at the viewBox edge, so a name that doesn't fit is a name
 * with its last few letters sliced off — silently, with nothing anywhere
 * reporting it.
 *
 * The budget, against the longest name the seed data holds (19 characters at 12
 * units, and EB Garamond averages about 0.45em per character, so ~103 units),
 * and against the *worst* reach either chart can produce, which is the donut's:
 *
 *     width ≥ 2·(radius + LABEL_GAP) + 2·textWidth
 *           ≥ 2·126 + 206  ≈ 458
 *
 * The `cos` that used to be in that line is gone, and its absence is the whole
 * reason this box was resized in Step 14. Six spokes starting at the top put
 * the star's side labels at 30° off horizontal, which pulls them in by a
 * factor of 0.866; six *slices* starting at the top put the donut's labels at
 * the slice middles, and two of those land at exactly three and nine o'clock.
 * Same six areas, 17 units further out, and a box budgeted for the star alone
 * clips the donut. A shared frame has to satisfy the worse of its tenants.
 *
 * It's also why the donut sets its percentage on a second line rather than
 * after a `·`: at full horizontal reach the extra " · 17.5%" is the difference
 * between fitting and not, and stacking is cheaper than another 90 units of
 * width the circle would then have to sit in the middle of.
 *
 * 520 leaves ~30 units of slack each side. The character-width figure is an
 * estimate — there is no way to measure a font from Node — so the slack is the
 * point, and a genuinely long area name is still worth checking on screen.
 * Height is set by the top and bottom labels, both of which can now be two
 * lines: `2·(radius + gap + 2·line)`.
 */
export const VIEW = {
  width: 520,
  height: 320,
  cx: 260,
  cy: 160,
  /** The outer extent. Every other radius is a fraction of this. */
  radius: 110,
} as const;

/**
 * One line of label text, in viewBox units.
 *
 * Named because two things have to agree on it and neither can ask the browser:
 * the donut stacks a percentage under a name using it, and `VIEW.height` was
 * budgeted assuming that stack. SVG has no line box — a `<tspan>` moves by
 * exactly the `dy` you give it — so leading here is a number somebody picks,
 * and 14 against a 12-unit font is the usual ~1.2.
 */
export const LINE = 14;

/** How far past the outer ring a label sits, in the same viewBox units. */
export const LABEL_GAP = 16;

/**
 * Anything below this counts as zero.
 *
 * Not decoration. `Math.cos(-Math.PI / 2)` is `6.123233995736766e-17`, not `0`,
 * because π/2 is not exactly representable in binary floating point — so a
 * point at the top of a circle, which obviously sits on the vertical axis, has
 * a *positive* cosine, and a naive `cos > 0` treats it as being off to the
 * right. Its label then hangs a full name's width to one side of a point that
 * is on neither side. It reads as a layout bug and it's an arithmetic one.
 */
const EPSILON = 1e-9;

/**
 * Two decimal places, for numbers on their way into markup.
 *
 * Coordinates come out of `Math.cos` carrying floating-point dust —
 * `260.00000000000006` — and two decimals is already far past the resolution of
 * any screen this renders on. Shared so the star's `points` and the donut's
 * dash lengths are rounded the same way.
 *
 * Known and accepted: this does not round a decimal `.005` tie upward, because
 * `1.005 * 100` is `100.49999999999999` in binary. See the test.
 */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Polar to Cartesian: the one piece of trigonometry in this project.
 *
 * `x = cx + r·cos(θ)`, `y = cy + r·sin(θ)`. An angle and a distance go in, a
 * point on the canvas comes out — the translation every radial chart needs,
 * because "how much" is naturally a distance or a sweep and SVG only accepts
 * coordinates.
 *
 * Worked, for a point at the top of the star's outer ring: θ is -π/2,
 * `cos(-π/2)` is 0 (to floating point's best effort) and `sin(-π/2)` is -1, so
 * the point is `(260 + 110·0, 150 + 110·-1)` = `(260, 40)` — same x as the
 * centre, 110 units *up* the screen.
 *
 * That minus is the part worth remembering. Angle 0 points **east**, not north,
 * and SVG's y axis grows **downward**, so positive angles sweep clockwise —
 * the opposite of the maths convention, and the reason hand-rolled radial
 * charts come out rotated or mirrored.
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
 * Used by the star (distance from centre) and the bars (length of the fill),
 * and *not* by the donut — which is the interesting part, so it's written down
 * here rather than in either caller.
 *
 * Share of the maximum pins the busiest area to the full extent and draws every
 * other one relative to it, so the picture is about **balance**: a lopsided
 * month is a spike, an even one is a regular hexagon or a stack of near-equal
 * bars, whatever the totals were. Share of the *total* would make six areas at
 * 20 marks each draw a small shape at 16.7% that says nothing the number 20
 * didn't.
 *
 * The cost is real and is the same one in both charts: the shape cannot tell
 * you how big a range was, because identical proportions at 60 marks and 600
 * draw identically. That's what the counts printed beside them are for.
 *
 * A donut may not use this. It is a part-to-whole claim — the ring *is* the
 * total — so its segments have to be shares of the total or the picture lies
 * about what it's showing. Same data, different question, different divisor.
 *
 * All zeros returns all zeros rather than `NaN`. `0/0` would poison every
 * coordinate downstream, and SVG's response to `NaN` in a `points` attribute is
 * to drop the shape silently — an empty range would render as a *missing*
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
 * Which end of a label attaches to the point it names.
 *
 * Text on the right of a chart should grow rightward (`start`), text on the
 * left should grow leftward (`end`), and text at the very top or bottom should
 * straddle its point (`middle`). Get it wrong and every left-hand label runs
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
 * How a label sits vertically against its point.
 *
 * Only labels on the vertical axis get pushed clear — the top one sits its
 * baseline on the point so the text is above it (`auto`), the bottom one hangs
 * below (`hanging`). Everything else is centred, because a label out at 30° is
 * already clear horizontally and nudging it vertically would leave it visibly
 * unaligned with what it names.
 *
 * So the test is `|cos|`, not `sin`: this asks "is it on the vertical axis",
 * where `labelAnchor` asks "which side is it on". Same cosine, two questions.
 */
export function labelBaseline(angle: number): "auto" | "middle" | "hanging" {
  if (Math.abs(Math.cos(angle)) > EPSILON) return "middle";
  return Math.sin(angle) < 0 ? "auto" : "hanging";
}

/**
 * How far to lift a stacked label so the block sits where one line would.
 *
 * `labelBaseline` positions a *line* of text against a point. Give that line a
 * second one below it and the answer is wrong in a way that's easy to miss:
 * a right-hand label asked to be `middle` centres its first line on the slice,
 * so the pair as a whole hangs half a line low and every label on that side
 * drifts downward together. It reads as sloppy alignment rather than as a bug,
 * which is exactly the kind that survives a review.
 *
 * The rule follows from what each baseline promises about the block, not the
 * line: `auto` means "all of it above the point", so a two-line block starts a
 * full line higher; `middle` means "straddling", so half a line; `hanging`
 * means "all of it below", which the first line already does.
 */
export function stackOffset(
  baseline: "auto" | "middle" | "hanging",
  lines: number,
): number {
  // A single line is already where it belongs. Also the second appearance of
  // the `-0` trap in this file — without this guard `auto` returns `-(0)`,
  // which `Object.is` says is not `0`. See `donutArcs`.
  if (lines <= 1) return 0;

  const extra = (lines - 1) * LINE;
  if (baseline === "auto") return -extra;
  if (baseline === "middle") return -extra / 2;
  return 0;
}

/** A circle's circumference — the length the donut's dash pattern is cut from. */
export function circumference(radius: number): number {
  return 2 * Math.PI * radius;
}

/** One segment of the donut, as the two attributes that draw it. */
export type Arc = {
  /** `stroke-dasharray`: one dash this segment's length, then a gap. */
  dashArray: string;
  /** `stroke-dashoffset`: slides the dash round to where it starts. */
  dashOffset: number;
};

/**
 * A donut, as one stroked circle per segment rather than six wedge paths.
 *
 * The obvious way to draw a pie is an `A` (elliptical arc) path per slice:
 * move to the centre, line out to the rim, arc along it, close. That works, and
 * it costs a `path` per slice with seven numbers in it, two of which — the
 * `large-arc-flag` and the `sweep-flag` — are single digits that silently
 * invert the drawing when wrong, so a slice over 180° renders as its own
 * complement. It's also the wrong shape for a *donut*, which then needs an
 * inner arc back the other way and a hole punched by winding direction.
 *
 * A stroke doesn't need any of that. One circle, `fill: none`, and a stroke as
 * thick as the ring is wide: the ring already exists, and all that's left is
 * deciding which part of it to paint. `stroke-dasharray` cuts the outline into
 * a dash and a gap, `stroke-dashoffset` slides that pattern around the rim, and
 * every segment is the same circle with two different numbers. Thickness is one
 * property rather than a second radius, and the hole comes free.
 *
 * `shares` are fractions of the total and are expected to sum to 1 — this is
 * the chart that must not use `normalize`. They don't *have* to sum to 1: a
 * short set leaves the rest of the ring unpainted, which is the honest picture
 * of a partial total rather than an error.
 *
 * Offsets are negative. A positive `stroke-dashoffset` shifts the pattern
 * *backwards* along the path, so painting segment `i` at distance `d` around
 * the rim means `-d`. Getting the sign wrong draws every segment in the right
 * size and the wrong order, which looks like the data is scrambled.
 *
 * Nothing here rotates the ring to start at twelve o'clock. A stroke begins at
 * angle 0, which is three o'clock — the caller turns the whole `<g>` by -90°,
 * because that's one transform on the group rather than an offset baked into
 * every segment.
 */
export function donutArcs(
  shares: readonly number[],
  length: number,
): Arc[] {
  const arcs: Arc[] = [];
  let travelled = 0;

  for (const share of shares) {
    const segment = share * length;
    arcs.push({
      dashArray: `${round2(segment)} ${round2(length - segment)}`,
      // The first segment's offset is `0`, written out rather than falling out
      // of `-0`. Negative zero is a real value here — `Object.is(-0, 0)` is
      // false, which is what `assert.strictEqual` compares with — so leaving it
      // would make the first arc need a different assertion from every other
      // one for no reason. It makes no difference to the markup: `String(-0)`
      // is `"0"`.
      dashOffset: travelled === 0 ? 0 : -round2(travelled),
    });
    travelled += segment;
  }

  return arcs;
}

/**
 * The angle pointing at the middle of each slice — where its label goes.
 *
 * Absolute angles, measured from twelve o'clock, and that is the part that
 * matters. The ring itself is drawn by `donutArcs`, which starts at three
 * o'clock because that's where a stroke starts, and the component turns the
 * whole group by -90° to fix it. Labels cannot ride along in that group: a
 * `rotate` on a `<g>` turns the glyphs too, so six names would come out lying on
 * their sides around the rim. They're positioned outside the transform instead,
 * from these angles, which already include the quarter turn.
 *
 * Mid-angle rather than start-angle, because a label names a slice rather than
 * marking a boundary — pointed at the edge between two of them it belongs to
 * neither.
 */
export function sliceMidAngles(shares: readonly number[]): number[] {
  const angles: number[] = [];
  let travelled = 0;

  for (const share of shares) {
    angles.push(TOP + 2 * Math.PI * (travelled + share / 2));
    travelled += share;
  }

  return angles;
}
