import { format } from "date-fns";

import { MOOD_SCORE, type MoodPoint, type MoodSeries } from "@/lib/analytics";
import { round2 } from "@/lib/charts";
import { formatDayShort, fromDayString, type DayString } from "@/lib/dates";
import { addDays, daysBetween } from "@/lib/daymath";
import { MOODS, MOOD_BG, MOOD_MOUTH, type Mood } from "@/lib/moods";

type Props = {
  series: MoodSeries;
  /** The line in words, from `moodTakeaway`. Null when empty. */
  takeaway: string | null;
  /** The page's rule; a prop so nothing draws when this returns null. */
  className?: string;
};

/** Fewer points than this: the bars already say it. */
const LINE_FROM = 2;

const TOP_SCORE = MOODS.length;

/**
 * Mood over time, great at the top. HTML dots and labels over a stretched SVG
 * line, so text and dots keep their size at any width. Positioned by date;
 * the line breaks across long unlogged gaps.
 */
export function MoodLine(props: Props) {
  const { points, from, to } = props.series;

  if (points.length < LINE_FROM || !from || !to) return null;

  const runs = split(points);

  return (
    <section className={`flex flex-col ${props.className ?? ""}`}>
      <h2 className="mb-5 font-display text-subhead text-ink">day by day</h2>

      {/* The chart for screen readers; the drawing is aria-hidden. */}
      {props.takeaway && <p className="sr-only">{props.takeaway}</p>}

      {/* Inner box is the plot; left gutter holds the faces. */}
      <div aria-hidden="true" className="h-59 pt-3 pr-3 pb-6 pl-8">
        <div className="relative size-full">
          {/* Gridline per mood, okay dashed. Borders keep dashes unstretched. */}
          {MOODS.map((mood, i) => (
            <span
              key={mood}
              style={{ top: `${(i / (MOODS.length - 1)) * 100}%` }}
              className={`absolute inset-x-0 border-t ${
                mood === "okay" ? "border-dashed border-rule-strong" : "border-rule-grid"
              }`}
            />
          ))}

          {MOODS.map((mood) => (
            <span
              key={mood}
              style={{ top: `${level(MOOD_SCORE[mood])}%` }}
              className="absolute -left-8 -translate-y-1/2 text-ink-muted"
            >
              <Face mood={mood} />
            </span>
          ))}

          {/* One polyline per run; a run of one is just its dot. */}
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 size-full overflow-visible"
          >
            {runs.map((run) => (
              <polyline
                key={run[0].day}
                points={run
                  .map((p) => `${round2(p.at * 100)},${round2(level(p.score))}`)
                  .join(" ")}
                className="fill-none stroke-ink"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>

          {points.map((point) => (
            <span
              key={point.day}
              style={{
                left: `${round2(point.at * 100)}%`,
                top: `${round2(level(point.score))}%`,
              }}
              className={`absolute size-2.5 -translate-1/2 rounded-full border border-ink ${MOOD_BG[point.mood]}`}
            />
          ))}

          <Ticks from={from} to={to} />
        </div>
      </div>

      <p className="sr-only">
        {points.length} day{points.length === 1 ? "" : "s"} logged between{" "}
        {formatDayShort(from)} and {formatDayShort(to)}.
      </p>
    </section>
  );
}

/** First, middle and last day under the plot. */
function Ticks(props: { from: DayString; to: DayString }) {
  const span = daysBetween(props.from, props.to);
  // Month and year past a year, so Marches don't collide.
  const label = (day: DayString) =>
    format(fromDayString(day), span > 330 ? "MMM yyyy" : "d MMM").toLowerCase();
  const half = Math.floor(span / 2);

  return (
    <span className="tabular absolute inset-x-0 top-full mt-1.5 text-caption text-ink-muted">
      <span className="absolute left-0">{label(props.from)}</span>
      {/* No middle label for very short spans. */}
      {span >= 4 && (
        <span style={{ left: `${(half / span) * 100}%` }} className="absolute -translate-x-1/2">
          {label(addDays(props.from, half))}
        </span>
      )}
      <span className="absolute right-0">{label(props.to)}</span>
    </span>
  );
}

/** MoodMark's face, bare and small, for the axis. */
function Face(props: { mood: Mood }) {
  return (
    <svg viewBox="0 0 24 24" className="block size-4.5">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="9" cy="9.5" r="1.1" fill="currentColor" />
      <circle cx="15" cy="9.5" r="1.1" fill="currentColor" />
      <path
        d={MOOD_MOUTH[props.mood]}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Score to % from top: 5 is 0%, 1 is 100%. */
function level(score: number): number {
  return ((TOP_SCORE - score) / (TOP_SCORE - 1)) * 100;
}

/** Split at each `gap` (a point that starts a new run). */
function split(points: MoodPoint[]): MoodPoint[][] {
  const runs: MoodPoint[][] = [];

  for (const point of points) {
    if (point.gap || runs.length === 0) runs.push([point]);
    else runs[runs.length - 1].push(point);
  }

  return runs;
}
