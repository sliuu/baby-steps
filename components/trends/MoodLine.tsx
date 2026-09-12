import type { MoodPoint, MoodSeries } from "@/lib/analytics";
import { round2 } from "@/lib/charts";
import { formatDayShort } from "@/lib/dates";
import { MOODS, MOOD_LABEL } from "@/lib/moods";

type Props = {
  series: MoodSeries;
  /** The line in words, from `moodTakeaway`. Null when the series is empty. */
  takeaway: string | null;
};

/**
 * The box, in `viewBox` units — and deliberately not `charts.ts`'s `VIEW`.
 *
 * That one is 520×320 because two *radial* charts had to share a frame, and its
 * width is budgeted for area names sticking out sideways past a ring. Nothing
 * about it describes a time series. Borrowing it would give this chart a
 * near-square box, which is the one shape a line chart should never be: the
 * slope of a line is an artefact of its aspect ratio, and squaring the box
 * steepens every change into something more dramatic than it was.
 *
 * 880×260 is roughly 3.4:1, wide enough that a month of days has room to be a
 * sequence rather than a zigzag. Same `viewBox` trick as everywhere else on
 * this page: these are invented units and the browser scales them to whatever
 * width the card gets, so nothing here asks how wide the page is.
 */
const VIEW = { width: 880, height: 260 };

/**
 * The margins, and the only one with a real calculation behind it is `left`.
 *
 * The y axis is labelled with the mood *words*, not numbers — see the note on
 * the gridlines — so the gutter has to hold the longest of them. "Great" is
 * five characters at 12 units, and EB Garamond runs about 0.45em per character,
 * so ~27 units, plus the 10-unit gap off the axis. 52 leaves a margin for a
 * face that measures wider than the estimate; SVG cannot reflow text, so the
 * failure mode is a silently clipped label.
 *
 * `bottom` holds one line of dates. `top` is a dot's radius and a little air,
 * so a Great day doesn't touch the panel's edge.
 */
const PAD = { left: 52, right: 14, top: 14, bottom: 28 };

const PLOT = {
  width: VIEW.width - PAD.left - PAD.right,
  height: VIEW.height - PAD.top - PAD.bottom,
};

/**
 * Two points, below which there is nothing a line can say.
 *
 * One dot in an empty grid is a chart in the sense that it has axes. What it
 * tells you — "one day, and it was Okay" — is already the sentence above it,
 * printed larger and in words, and drawing a full panel to repeat it makes the
 * page look like it's holding more than it is.
 */
const LINE_FROM = 2;

/** The top of the scale, so the y mapping doesn't hardcode a 5 twice. */
const TOP_SCORE = MOODS.length;

/**
 * How the mood went, day by day.
 *
 * This is the one chart in the app that draws *time* on an axis. The strip
 * below it counts how many days felt each way and throws the dates out; the
 * calendar keeps the dates and shows one month; neither can answer "is this
 * getting better", which is the question that made the tab worth having.
 *
 * **Ink, no hue, and that is not a styling default.** `MoodMark` says it,
 * `wash()` in `palette.ts` says it and `highlight.ts` says it: the six colours
 * mean the six life areas, everywhere in the app, and this is the page where
 * both appear. A green line for a good stretch would be a seventh meaning for
 * a colour that already has one, sitting a tab away from the star that owns it.
 *
 * Positioned by date rather than by index — see `MoodPoint.at`. A fortnight you
 * didn't log is a fortnight of horizontal distance, so the gaps in the line are
 * the gaps in the record, and a run of daily entries looks denser than a run of
 * Sundays because it is.
 *
 * **The line goes through the dots, not near them.** It drew a rolling mean for
 * about an hour. Two things were wrong with that: the curve sat off the points
 * it was computed from, so the drawing showed heights that are not moods on a
 * scale whose whole content is five named rungs; and it answered a question
 * nobody asked here — the *direction* is already stated in words above the
 * chart, by `moodTakeaway`, which is a better instrument for it than a curve
 * you have to eyeball. What a picture can do that a sentence can't is show you
 * the actual days, so that is all it does.
 *
 * Not in a `ChartCard`, for `MostDone`'s reason and one more: that card exists
 * so two charts sharing a `viewBox` couldn't resize their column, and this box
 * is a different shape on purpose (see `VIEW` above). It keeps the same chrome
 * so the panels still read as a set.
 */
export function MoodLine(props: Props) {
  const { points, from, to } = props.series;

  // The strip directly below has its own empty state and it says the useful
  // thing — where to go and log one. A second empty panel above it would be the
  // same sentence twice, with a box drawn round one of them.
  if (points.length < LINE_FROM) return null;

  const runs = split(points);

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-hairline bg-surface p-6">
      <h2 className="eyebrow">Mood over time</h2>

      {/* The reading, before the picture. Same job as `Readout`'s sentence and
          the same reason it's a prop: the branching behind it is in
          `moodTakeaway`, where `assert` can reach it. It is also what makes the
          chart's `aria-hidden` legitimate — this line *is* the chart, for
          anyone who isn't looking at it. */}
      {props.takeaway && (
        <p className="max-w-prose font-heading text-[1.35rem] leading-snug">
          {props.takeaway}
        </p>
      )}

      <div
        aria-hidden="true"
        className="min-h-fit w-full"
        style={{ aspectRatio: `${VIEW.width} / ${VIEW.height}` }}
      >
        <svg viewBox={`0 0 ${VIEW.width} ${VIEW.height}`} className="h-full w-full">
          {/* The gridlines, one per mood, labelled with the word. A numeric
              axis would print the invented scale — see `MOOD_SCORE` — and give
              "3.4" an authority it hasn't got. The words are the units the rest
              of the app deals in, and they make the five rungs the only
              readings the chart claims to have. */}
          {MOODS.map((mood, i) => {
            const y = round2(rowY(i));
            return (
              <g key={mood}>
                <line
                  x1={PAD.left}
                  x2={VIEW.width - PAD.right}
                  y1={y}
                  y2={y}
                  className="stroke-hairline"
                  vectorEffect="non-scaling-stroke"
                />
                <text
                  x={PAD.left - 10}
                  y={y}
                  textAnchor="end"
                  dominantBaseline="middle"
                  className="fill-ink-muted text-[12px]"
                >
                  {MOOD_LABEL[mood]}
                </text>
              </g>
            );
          })}

          {/* The line, in runs, straight from one logged day to the next. A
              run ends where more than a week went unlogged: joining across that
              would slope through a fortnight nobody recorded, and it would look
              exactly like a fortnight somebody did.

              A run of one point draws nothing here — a polyline needs two — and
              that's right, because its dot is already the whole of what's
              known about it. */}
          {runs.map((run) => (
            <polyline
              key={run[0].day}
              points={run
                .map((p) => `${round2(x(p))},${round2(y(p.score))}`)
                .join(" ")}
              className="fill-none stroke-ink"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              // Without this the stroke scales with the box: 2 units at a card
              // 1.05× the viewBox is fine, and at half the width on a phone it
              // thins to a hairline.
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* The days themselves, on the line rather than under it — same
              coordinates, drawn after so the joint at each vertex is a mark you
              can point at instead of a corner. `fill-ink` and not muted: these
              are the measurements, and the segments between them are the only
              part of this drawing that is interpolation. */}
          {points.map((point) => (
            <circle
              key={point.day}
              cx={round2(x(point))}
              cy={round2(y(point.score))}
              r={3}
              className="fill-ink"
            />
          ))}

          {/* Both ends of the span, and nothing between them. A time axis
              normally gets regular ticks; this one can't, because the span is
              whatever the range picker resolved to — a fortnight or eleven
              years — and ticks that fit one make nonsense of the other. The two
              dates bound it, the band above the tabs already prints the range,
              and the exact day of any single point is on the calendar. */}
          <text
            x={PAD.left}
            y={VIEW.height - 8}
            className="fill-ink-muted text-[12px]"
          >
            {formatDayShort(from!)}
          </text>
          {from !== to && (
            <text
              x={VIEW.width - PAD.right}
              y={VIEW.height - 8}
              textAnchor="end"
              className="fill-ink-muted text-[12px]"
            >
              {formatDayShort(to!)}
            </text>
          )}
        </svg>
      </div>

      {/* What the axes say, for anyone the drawing is hidden from. The shape is
          in the sentence at the top; this is the frame around it — where the
          line starts and where it stops. The days themselves aren't listed: a
          year of "12 March, Good" is not a reading of a trend, and the calendar
          is where a single day lives. */}
      <p className="sr-only">
        {points.length} day{points.length === 1 ? "" : "s"} logged between{" "}
        {formatDayShort(from!)} and {formatDayShort(to!)}.
      </p>
    </section>
  );
}

/** Where a mood's gridline sits: row 0 is Great, at the top. */
function rowY(row: number): number {
  return PAD.top + (row / (MOODS.length - 1)) * PLOT.height;
}

/** A score's height. 5 at the top gridline, 1 at the bottom one. */
function y(score: number): number {
  return PAD.top + ((TOP_SCORE - score) / (MOODS.length - 1)) * PLOT.height;
}

/** A point's place along the span. `at` is already the 0–1 fraction. */
function x(point: MoodPoint): number {
  return PAD.left + point.at * PLOT.width;
}

/**
 * The points cut into runs at every break.
 *
 * `gap` marks the point that *starts* a new run — it's true when the stretch
 * before it was too long to draw through — so this is one pass with no
 * lookahead. Splitting here rather than in `lib/analytics.ts` because a run is
 * a fact about drawing: the same series rendered as a table wants nothing to do
 * with it.
 */
function split(points: MoodPoint[]): MoodPoint[][] {
  const runs: MoodPoint[][] = [];

  for (const point of points) {
    if (point.gap || runs.length === 0) runs.push([point]);
    else runs[runs.length - 1].push(point);
  }

  return runs;
}
