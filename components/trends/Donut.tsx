import { ChartCard } from "./ChartCard";
import type { Tally } from "@/lib/analytics";
import {
  LABEL_GAP,
  LINE,
  VIEW,
  circumference,
  donutArcs,
  labelAnchor,
  labelBaseline,
  polar,
  sliceMidAngles,
  stackOffset,
} from "@/lib/charts";
import { ramp } from "@/lib/palette";

type Props = { tally: Tally };

/**
 * How thick the ring is, in viewBox units.
 *
 * A donut and not a pie, because the hole is useful: it holds the total, which
 * is the one number a part-to-whole chart can't show you. A solid pie would
 * have to print it outside, next to a chart that's already busy.
 */
const THICKNESS = 26;

/**
 * The radius of the circle the stroke is centred on.
 *
 * Not `VIEW.radius`. A stroke straddles its path — half of `THICKNESS` falls
 * outside the circle and half inside — so a ring drawn at radius 110 would
 * reach 123 and collide with labels placed at 126. Pulling the path in by half
 * the thickness puts the ring's *outer edge* exactly on `VIEW.radius`, which is
 * where the star's outer ring is. The two charts then occupy the same circle
 * and switching between them changes the drawing and nothing else.
 */
const RING_RADIUS = VIEW.radius - THICKNESS / 2;

/**
 * The same range as a part-to-whole claim.
 *
 * The one chart here that must not use `normalize`. The star and the bars both
 * scale against the busiest area, because they're about balance; a ring *is*
 * the total, so its segments have to be shares of the total or the picture is
 * lying about what it shows. That's `AreaTally.share`, computed back in Step 12
 * and used here without a division in sight — same data, different question,
 * different divisor.
 *
 * Six stroked circles rather than six wedge paths. `donutArcs` has the full
 * argument; the short version is that the ring already exists as a circle's
 * outline, and all that's left is choosing which part of it to paint.
 *
 * Like the star, it draws `tally.areas` in the library's order rather than
 * sorted. The colours then sit in the same places from one range to the next,
 * so a segment you recognise stays recognisable.
 */
export function Donut(props: Props) {
  const { areas, total } = props.tally;
  const { cx, cy } = VIEW;

  if (areas.length === 0) return null;

  const length = circumference(RING_RADIUS);
  const arcs = donutArcs(
    areas.map((area) => area.share),
    length,
  );
  const midAngles = sliceMidAngles(areas.map((area) => area.share));

  return (
    <ChartCard>
      <svg
        viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
        className="h-full w-full"
      >
        {/* The unpainted ring behind the segments. It matters in exactly one
            case — when the shares don't cover the whole circle — and today they
            always do. It stays because "the rest of the ring" needs somewhere
            to be: without it a partial total would read as a smaller donut
            rather than an incomplete one. */}
        <circle
          cx={cx}
          cy={cy}
          r={RING_RADIUS}
          className="fill-none stroke-hairline"
          strokeWidth={THICKNESS}
        />

        {/* One transform for the whole ring rather than a quarter turn baked
            into every offset. A stroke starts at three o'clock, and everything
            else on this page starts at twelve.

            The labels are deliberately *not* in here: `rotate` on a `<g>` turns
            the glyphs along with the geometry, so six area names would come out
            lying on their sides around the rim. They're placed below from
            `sliceMidAngles`, which already includes this quarter turn. */}
        <g transform={`rotate(-90 ${cx} ${cy})`}>
          {areas.map((area, i) => (
            <circle
              key={area.areaId}
              cx={cx}
              cy={cy}
              r={RING_RADIUS}
              // No fill. The segment is the outline of this circle, not the
              // disc — the disc would cover the whole chart six times over.
              className={`fill-none ${ramp(area.colorKey).softStroke}`}
              strokeWidth={THICKNESS}
              strokeDasharray={arcs[i].dashArray}
              strokeDashoffset={arcs[i].dashOffset}
              // Not `non-scaling-stroke` here, unlike every hairline on this
              // page. This stroke *is* the drawing: pinning it to one device
              // pixel would render the ring as a 26-pixel band no matter how
              // wide the card is, which is the opposite of what the viewBox is
              // for. Hairlines want to stay hairlines; a donut wants to scale.
            />
          ))}
        </g>

        {/* The total, in the hole. The number a ring can't otherwise tell you —
            every segment is a proportion, and proportions of what is the
            question this answers. */}
        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          dominantBaseline="middle"
          className="tabular fill-ink text-[30px]"
        >
          {total}
        </text>
        <text
          x={cx}
          y={cy + 20}
          textAnchor="middle"
          dominantBaseline="middle"
          // The eyebrow's look, spelled out rather than using the `eyebrow`
          // utility. That utility sets its size in `rem`, which is a fact about
          // the page's font size and would refuse to scale with the viewBox
          // like everything else in here.
          className="fill-ink-muted text-[10px] tracking-[0.18em] uppercase"
        >
          {total === 1 ? "Mark" : "Marks"}
        </text>

        {/* The area's name, with its share stacked underneath, pointing at the
            middle of each segment.

            Percentages rather than the counts the star prints beside the same
            names. Deliberate: this chart's claim is about proportion, and the
            two labellings are how the same six areas say two different things.

            Stacked rather than run on after a `·`, and that's a measurement
            rather than a preference — two of six labels land at exactly three
            and nine o'clock, where the box has the least room to give. See
            `VIEW`.

            Empty areas get no label. They have no segment to point at, and
            their mid-angle sits exactly on the boundary between their
            neighbours — so a zero label lands on somebody else's colour. */}
        {areas.map((area, i) => {
          if (area.count === 0) return null;

          const angle = midAngles[i];
          const at = polar(cx, cy, VIEW.radius + LABEL_GAP, angle);
          // The same angle-driven anchoring the star uses, which is most of why
          // it lives in `charts.ts` now.
          const baseline = labelBaseline(angle);

          return (
            <text
              key={area.areaId}
              x={at.x}
              // Lifted so the two lines together sit where one would. Without
              // it every side label hangs half a line below its own segment.
              y={at.y + stackOffset(baseline, 2)}
              textAnchor={labelAnchor(angle)}
              dominantBaseline={baseline}
              className="fill-ink text-[12px]"
            >
              {area.areaName}
              {/* `x` again on the second line, because a `<tspan>` continues
                  from where the last one ended rather than returning to the
                  text element's origin — `dy` alone would step the percentage
                  diagonally off to the right of the name. */}
              <tspan
                x={at.x}
                dy={LINE}
                className="tabular fill-ink-muted"
              >
                {area.percent.toFixed(1)}%
              </tspan>
            </text>
          );
        })}
      </svg>
    </ChartCard>
  );
}
