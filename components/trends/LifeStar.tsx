import { ChartCard } from "./ChartCard";
import type { Tally } from "@/lib/analytics";
import {
  LABEL_GAP,
  VIEW,
  labelAnchor,
  labelBaseline,
  normalize,
  polar,
} from "@/lib/charts";
import {
  RINGS,
  ringPoints,
  spokeAngle,
  starPoints,
  toPoints,
} from "@/lib/lifestar";
import { categoryColor } from "@/lib/palette";

type Props = { tally: Tally };

/** Six spokes and their shape. Library order, never sorted, so ranges compare by outline. */
export function LifeStar(props: Props) {
  const { categories } = props.tally;
  const { cx, cy, radius } = VIEW;

  // No categories: nothing to draw.
  if (categories.length === 0) return null;

  /**
   * Distance from the centre is a share of the *busiest* category, not of the
   * total — so the fullest spoke always reaches the outer ring and the shape
   * reads as balance rather than volume. See `normalize`, which also explains
   * what that costs.
   */
  const shares = normalize(categories.map((category) => category.count));
  const vertices = starPoints(shares, radius, cx, cy);

  return (
    <ChartCard>
      <svg
        viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
        className="h-full w-full"
      >
        {/* Dotted rings, like the flower. */}
        {RINGS.map((ring) => (
          <polygon
            key={ring}
            points={toPoints(ringPoints(categories.length, radius * ring, cx, cy))}
            className="fill-none stroke-rule-strong"
            strokeWidth={1}
            strokeDasharray="1 4"
            // One device pixel at any size.
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {/* Spokes, drawn for empty categories too. */}
        {categories.map((category, i) => {
          const end = polar(cx, cy, radius, spokeAngle(i, categories.length));
          return (
            <line
              key={category.categoryId}
              x1={cx}
              y1={cy}
              x2={end.x}
              y2={end.y}
              className="stroke-rule-grid"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
        {/* Neutral fill; the dots carry the colour. */}
        <polygon
          points={toPoints(vertices)}
          className="fill-ink/6 stroke-ink"
          strokeWidth={1.5}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {/* A dot per vertex in the category ink. */}
        {categories.map((category, i) => (
          <circle
            key={category.categoryId}
            cx={vertices[i].x}
            cy={vertices[i].y}
            r={5}
            className={categoryColor(category.colorKey).fill}
          />
        ))}

        {/* "Category · count" at each spoke end, just outside the outer ring. */}
        {categories.map((category, i) => {
          const angle = spokeAngle(i, categories.length);
          const at = polar(cx, cy, radius + LABEL_GAP, angle);
          return (
            <text
              key={category.categoryId}
              x={at.x}
              y={at.y}
              // Anchor from the angle.
              textAnchor={labelAnchor(angle)}
              dominantBaseline={labelBaseline(angle)}
              // `fill-*`, not `text-*`: SVG text. Caption size was budgeted in `VIEW.width`.
              className={`text-caption lowercase ${categoryColor(category.colorKey).textFill}`}
            >
              {category.categoryName}
              <tspan className="tabular fill-ink-muted"> · {category.count}</tspan>
            </text>
          );
        })}
      </svg>
    </ChartCard>
  );
}
