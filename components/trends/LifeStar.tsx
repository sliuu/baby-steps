import type { Tally } from "@/lib/analytics";
import {
  LABEL_GAP,
  RINGS,
  VIEW,
  labelAnchor,
  labelBaseline,
  normalize,
  polar,
  ringPoints,
  spokeAngle,
  starPoints,
  toPoints,
} from "@/lib/lifestar";
import { ramp } from "@/lib/palette";

type Props = { tally: Tally };

/**
 * The default view of a range: six spokes, and the shape they make.
 *
 * Hand-written SVG, no chart library. Partly because the Life Star is a custom
 * shape a library would have to be fought into drawing, and partly because
 * everything it needs is one function — `polar` — plus a `viewBox`.
 *
 * The component does no arithmetic of its own. Every coordinate comes from
 * `lib/lifestar.ts`, which is where the numbers can be tested; what's left here
 * is which element goes in which order, and that genuinely does have to be
 * looked at rather than asserted.
 *
 * It draws `tally.areas` in the library's order, never sorted. That's the seam
 * `AreaTable` was written around in Step 12: the table ranks biggest-first
 * because it answers "what came top", and the star must not, because a polygon
 * whose vertices reorder by count changes shape for a reason that has nothing
 * to do with the data. Spirituality is the top spoke in January and in August,
 * so two ranges can be compared by their outline.
 */
export function LifeStar(props: Props) {
  const { areas } = props.tally;
  const { cx, cy, radius } = VIEW;

  // A polygon needs corners. Nothing in this app produces a user with no life
  // areas, but a chart that throws is a worse answer than a chart that admits
  // it has nothing to draw.
  if (areas.length === 0) return null;

  /**
   * Distance from the centre is a share of the *busiest* area, not of the
   * total — so the fullest spoke always reaches the outer ring and the shape
   * reads as balance rather than volume. See `normalize`, which also explains
   * what that costs.
   */
  const shares = normalize(areas.map((area) => area.count));
  const vertices = starPoints(shares, radius, cx, cy);

  return (
    // Only the chart panel and the calendar grid get a card. The readout column
    // Step 15 adds sits directly on the page ground, so this surface is what
    // separates "the drawing" from "the numbers about it".
    <figure className="rounded-2xl border border-hairline bg-surface p-6">
      <svg
        viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
        // Width comes from the card, height from the viewBox's aspect ratio.
        // This is the whole reason the geometry is written in invented units:
        // the drawing is resolution-independent for free, and no code anywhere
        // asks how wide the card is.
        className="w-full"
        /**
         * Hidden from screen readers, deliberately and conditionally.
         *
         * A radar chart is shape, and shape does not survive being read aloud —
         * the honest text version of it is a table of counts, which is exactly
         * what `AreaTable` already renders from the same `tally` on this same
         * page. Two announcements of one dataset is worse than one good one.
         *
         * The condition is the part worth writing down: this is only correct
         * while an accessible table of the same numbers is on screen beside it.
         * If a step ever renders the star alone, this attribute has to go and
         * be replaced with a real `role="img"` and a summary.
         */
        aria-hidden="true"
      >
        {/* The rings, outermost first — they're the graph paper, so everything
            else is drawn over them. */}
        {RINGS.map((ring) => (
          <polygon
            key={ring}
            points={toPoints(ringPoints(areas.length, radius * ring, cx, cy))}
            className="fill-none stroke-hairline"
            strokeWidth={1}
            // Without this, the stroke scales with the drawing: the viewBox is
            // 460 units shown across roughly 600px, so a 1-unit hairline
            // renders at 1.3px and lands on a half-pixel boundary looking
            // furred. `non-scaling-stroke` pins it to one device pixel at any
            // size, which is what "hairline" is supposed to mean.
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {/* Spokes, from the centre out to the outer ring. Drawn even for an
            area with no marks — an empty spoke is the fact that the area exists
            and is at zero, which is different from it not being there. */}
        {areas.map((area, i) => {
          const end = polar(cx, cy, radius, spokeAngle(i, areas.length));
          return (
            <line
              key={area.areaId}
              x1={cx}
              y1={cy}
              x2={end.x}
              y2={end.y}
              className="stroke-hairline"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}

        {/* The star. Filled neutral rather than blended from six hues — six
            colours meeting inside one polygon makes a muddy shape that belongs
            to no area, and the vertex dots carry the colour instead.
            `stroke-linejoin: round` keeps a sharp spike from growing a spur at
            its tip, which is what a mitred join does at a narrow angle. */}
        <polygon
          points={toPoints(vertices)}
          className="fill-ink/10 stroke-ink"
          strokeWidth={1.5}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />

        {/* A dot per vertex, in the area's own colour. Drawn after the polygon
            so the stroke doesn't cut across them. */}
        {areas.map((area, i) => (
          <circle
            key={area.areaId}
            cx={vertices[i].x}
            cy={vertices[i].y}
            r={4}
            className={ramp(area.colorKey).fill}
            // The ring in the card's own colour is what keeps two adjacent
            // dots on a pinched (near-zero) polygon from reading as one blob.
            stroke="var(--surface)"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {/* "Area · count" at each spoke end, just outside the outer ring. */}
        {areas.map((area, i) => {
          const angle = spokeAngle(i, areas.length);
          const at = polar(cx, cy, radius + LABEL_GAP, angle);
          return (
            <text
              key={area.areaId}
              x={at.x}
              y={at.y}
              // Which end of the text attaches to the spoke, and how it sits
              // vertically. Both are computed from the angle rather than
              // written out per area — the six-area version of this is a table
              // of anchors that silently becomes wrong at seven.
              textAnchor={labelAnchor(angle)}
              dominantBaseline={labelBaseline(angle)}
              // SVG text takes its colour from `fill`. `text-ink` would set the
              // `color` property, which a `<text>` element ignores.
              // 12 viewBox units, not 12px — it scales with the drawing like
              // everything else here. The number is load-bearing: `VIEW.width`
              // was budgeted against it, so changing it can clip a long name.
              className="fill-ink text-[12px]"
            >
              {area.areaName}
              {/* The count in the same muted grey and tabular figures the table
                  uses, so the two readings of one number match. */}
              <tspan className="tabular fill-ink-muted"> · {area.count}</tspan>
            </text>
          );
        })}
      </svg>
    </figure>
  );
}
