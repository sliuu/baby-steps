import { format } from "date-fns";

import { MOOD_SCORE, type MoodPoint, type MoodSeries } from "@/lib/analytics";
import { round2 } from "@/lib/charts";
import { formatDayShort, fromDayString, type DayString } from "@/lib/dates";
import { addDays, daysBetween } from "@/lib/daymath";
import { MOODS, MOOD_MOUTH, type Mood } from "@/lib/moods";

type Props = {
  series: MoodSeries;
  /** The line in words, from `moodTakeaway`. Null when the series is empty. */
  takeaway: string | null;
  /**
   * The rule above it, which the page decides: a hairline under the bars on a
   * phone, the page's rule at the top of a column on a wide screen. A prop
   * rather than a wrapper, because a wrapper would still draw its rule on the
   * days this returns nothing.
   */
  className?: string;
};

/**
 * Two points, below which there is nothing a line can say.
 *
 * One dot in an empty grid is a chart in the sense that it has axes. What it
 * tells you — "one day, and it was Okay" — is already in the bars above or
 * beside it, and drawing a full panel to repeat it makes the page look like
 * it's holding more than it is.
 */
const LINE_FROM = 2;

/** The top of the scale, so the y mapping doesn't hardcode a 5 twice. */
const TOP_SCORE = MOODS.length;

/**
 * The three faces on the axis: top, middle and bottom. Five would crowd a
 * 236px chart into a column of faces, and the two in between are implied by
 * the gridlines they sit halfway along.
 */
const AXIS_FACES: Mood[] = ["great", "okay", "rough"];

/**
 * How the mood went, day by day.
 *
 * This is the one chart in the app that draws *time* on an axis. The bars
 * count how many days felt each way and throw the dates out; the calendar
 * keeps the dates and shows one month; neither can answer "is this getting
 * better", which is the question that made the tab worth having.
 *
 * **Drawn in HTML over a stretched SVG, not as one scaled SVG.** It was an
 * 880×260 `viewBox` scaled to fit, which meant every piece of text in it was
 * as big as the column was wide, and shrank to a squint on a phone.
 * Now only the polylines are SVG, stretched
 * with `preserveAspectRatio="none"` and kept at a true pixel width by
 * `non-scaling-stroke` — and the dots, faces and dates are positioned
 * elements at percentages of the plot. A dot is a circle at any width, and a
 * date is 10px whether the chart is 330px or 700px wide.
 *
 * **Grey, no hue, and that is not a styling default.** The six colours mean
 * the six life areas everywhere in the app, and this is the page where both
 * appear. A green line for a good stretch would be a seventh meaning for a
 * colour that already has one.
 *
 * Positioned by date rather than by index — see `MoodPoint.at`. A fortnight you
 * didn't log is a fortnight of horizontal distance, and the line breaks across
 * more than a week unlogged rather than sloping through it.
 *
 * The line goes through the dots, not near them. No rolling mean, no average
 * line: the scale's whole content is five named rungs, and a curve between
 * them draws heights that are not moods.
 */
export function MoodLine(props: Props) {
  const { points, from, to } = props.series;

  // The bars have their own empty state and it says the useful thing — where
  // to go and log one. A second empty panel would be the same sentence twice.
  if (points.length < LINE_FROM || !from || !to) return null;

  const runs = split(points);

  return (
    <section className={`flex flex-col gap-3 ${props.className ?? ""}`}>
      <h2 className="eyebrow">Day by day</h2>

      {/* The reading, before the picture — heard, not shown. It is what makes
          the chart's `aria-hidden` legitimate: this line *is* the chart, for
          anyone who isn't looking at it. The branching behind it is in
          `moodTakeaway`, where `assert` can reach it. */}
      {props.takeaway && <p className="sr-only">{props.takeaway}</p>}

      {/* The padding is the design's — a dot's clearance at the right and
          top, a line of dates along the bottom — except the left gutter, which
          is 30px rather than 22 so the faces can be a size you can read. The
          inner box is the plot, and every percentage below is a fraction of
          it. */}
      <div aria-hidden="true" className="h-[236px] pt-3 pr-3 pb-[22px] pl-[30px]">
        <div className="relative size-full">
          {/* One hairline per mood, the middle one dashed. HTML borders
              rather than SVG lines because a dash pattern on a stretched SVG
              stretches with it; a border's dashes are always the same size. */}
          {MOODS.map((mood, i) => (
            <span
              key={mood}
              style={{ top: `${(i / (MOODS.length - 1)) * 100}%` }}
              className={`absolute inset-x-0 border-t ${
                mood === "okay" ? "border-dashed border-ink/15" : "border-hairline"
              }`}
            />
          ))}

          {AXIS_FACES.map((mood) => (
            <span
              key={mood}
              style={{ top: `${level(MOOD_SCORE[mood])}%` }}
              className="absolute -left-[30px] -translate-y-1/2 text-ink/35"
            >
              <Face mood={mood} />
            </span>
          ))}

          {/* The line, in runs. A run ends where more than a week went
              unlogged: joining across that would slope through a fortnight
              nobody recorded, and it would look exactly like a fortnight
              somebody did. A run of one draws nothing — a polyline needs two —
              and its dot is already the whole of what's known about it. */}
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
                className="fill-none stroke-ink-muted"
                strokeWidth={1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>

          {/* The days themselves: open dots, page-coloured inside, so the
              line visibly passes *into* each one. These are the measurements;
              the segments between them are the only interpolation here. */}
          {points.map((point) => (
            <span
              key={point.day}
              style={{
                left: `${round2(point.at * 100)}%`,
                top: `${round2(level(point.score))}%`,
              }}
              className="absolute size-[6.5px] -translate-1/2 rounded-full border-[1.4px] border-ink-label bg-background"
            />
          ))}

          <Ticks from={from} to={to} />
        </div>
      </div>

      {/* What the axes say, for anyone the drawing is hidden from. */}
      <p className="sr-only">
        {points.length} day{points.length === 1 ? "" : "s"} logged between{" "}
        {formatDayShort(from)} and {formatDayShort(to)}.
      </p>
    </section>
  );
}

/**
 * First, middle and last day, under the plot. The first hangs from its start
 * and the last from its end so neither runs off the chart; the middle is
 * centred on its day. A time axis normally gets regular ticks, and this one
 * can't: the span is whatever the range resolved to, a fortnight or eleven
 * years, and ticks that fit one make nonsense of the other.
 */
function Ticks(props: { from: DayString; to: DayString }) {
  const span = daysBetween(props.from, props.to);
  const label = (day: DayString) =>
    // Day and month while the span fits in a year; month and year beyond it,
    // where "3 Mar" would be three different Marches.
    format(fromDayString(day), span > 330 ? "MMM yyyy" : "d MMM");
  const half = Math.floor(span / 2);

  return (
    <span className="tabular absolute inset-x-0 top-full mt-1.5 text-[0.66rem] text-ink-muted">
      <span className="absolute left-0">{label(props.from)}</span>
      {/* Two days' span has no middle worth a label: it would sit a
          character's width from both ends. */}
      {span >= 4 && (
        <span
          style={{ left: `${(half / span) * 100}%` }}
          className="absolute -translate-x-1/2"
        >
          {label(addDays(props.from, half))}
        </span>
      )}
      <span className="absolute right-0">{label(props.to)}</span>
    </span>
  );
}

/**
 * `MoodMark`'s face without its wrapper — no title, no name, smaller, and
 * lighter than the data it labels. The axis faces are scale markers, and at
 * full ink they would outweigh the line.
 */
function Face(props: { mood: Mood }) {
  return (
    <svg viewBox="0 0 24 24" className="block size-[18px]">
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

/** A score's height as a percentage from the top: 5 is 0%, 1 is 100%. */
function level(score: number): number {
  return ((TOP_SCORE - score) / (TOP_SCORE - 1)) * 100;
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
