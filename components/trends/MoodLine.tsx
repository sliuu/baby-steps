import { format } from "date-fns";
import { useId } from "react";

import { MoodMark } from "@/components/calendar/MoodMark";

import { MOOD_SCORE, type MoodPoint, type MoodSeries } from "@/lib/analytics";
import { round2 } from "@/lib/charts";
import { formatDayShort, fromDayString, type DayString } from "@/lib/dates";
import { addDays, daysBetween } from "@/lib/daymath";
import { SECTION_TITLE } from "@/lib/layout";
import { MOODS, MOOD_BG, MOOD_COLOR } from "@/lib/moods";

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

/** Plot height and insets, shared with MoodBars so its rows sit on the gridlines. */
export const MOOD_PLOT = "h-59 pt-s2 pb-s4";

/**
 * Mood over time, great at the top. HTML dots and labels over a stretched SVG
 * line, so text and dots keep their size at any width. Positioned by date;
 * the line breaks across long unlogged gaps.
 */
export function MoodLine(props: Props) {
  const { points, from, to } = props.series;
  const gradient = useId();

  if (points.length < LINE_FROM || !from || !to) return null;

  const runs = split(points);

  return (
    <section className={`flex flex-col ${props.className ?? ""}`}>
      <h2 className={`mb-s4 ${SECTION_TITLE}`}>day by day</h2>

      {/* The chart for screen readers; the drawing is aria-hidden. */}
      {props.takeaway && <p className="sr-only">{props.takeaway}</p>}

      {/* Inner box is the plot; left gutter holds the faces. */}
      <div aria-hidden="true" className={`${MOOD_PLOT} pr-s2 pl-s6`}>
        <div className="relative size-full">
          {/* Gridline per mood. */}
          {MOODS.map((mood, i) => (
            <span
              key={mood}
              style={{ top: `${(i / (MOODS.length - 1)) * 100}%` }}
              className="absolute inset-x-0 border-t border-rule-grid"
            />
          ))}

          {MOODS.map((mood) => (
            <span
              key={mood}
              style={{ top: `${level(MOOD_SCORE[mood])}%` }}
              className="absolute -left-8.5 -translate-y-1/2"
            >
              <MoodMark mood={mood} />
            </span>
          ))}

          {/* A segment per pair of days, its colour running from one mood to the next. */}
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 size-full overflow-visible"
          >
            {runs.flatMap((run) =>
              run.slice(1).map((b, i) => {
                const a = run[i];
                const id = `${gradient}-${b.day}`;
                const [x1, y1, x2, y2] = [a.at * 100, level(a.score), b.at * 100, level(b.score)].map(round2);
                return (
                  <g key={b.day}>
                    {/* User space: a flat segment has no height to stretch a box gradient over. */}
                    <linearGradient id={id} gradientUnits="userSpaceOnUse" x1={x1} y1={y1} x2={x2} y2={y2}>
                      <stop offset="0" stopColor={MOOD_COLOR[a.mood]} />
                      <stop offset="1" stopColor={MOOD_COLOR[b.mood]} />
                    </linearGradient>
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={`url(#${id})`}
                      strokeWidth={3}
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                    />
                  </g>
                );
              }),
            )}
          </svg>

          {points.map((point) => (
            <span
              key={point.day}
              style={{
                left: `${round2(point.at * 100)}%`,
                top: `${round2(level(point.score))}%`,
              }}
              className={`absolute size-2.5 -translate-1/2 rounded-full ${MOOD_BG[point.mood]}`}
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

/** Score to % from top: 5 is 0%, 1 is 100%. */
export function level(score: number): number {
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
