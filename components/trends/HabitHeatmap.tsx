"use client";

import { useEffect, useRef } from "react";

import { formatDayLong, formatDayShort, type DayString } from "@/lib/dates";
import { heatLevel, monthLabels, type HeatRow } from "@/lib/heatmap";
import { PANEL } from "@/lib/layout";
import { ramp } from "@/lib/palette";

type Props = {
  rows: HeatRow[];
  /** The window the rows were counted over, oldest first. From `dayWindow`. */
  days: DayString[];
};

/**
 * The strip's geometry, in pixels, because this is the one drawing on the page
 * that cannot be sized in `em`.
 *
 * Every other panel here scales with the type. This one can't: a cell has to be
 * the same width as the cell above it in a different row, and the rows are
 * separate elements with their own text in them. One shared number in pixels is
 * what makes a dozen independent tracks line up, and it's what lets the month
 * labels be positioned by arithmetic — `NAME + index * PITCH` — instead of by
 * measuring anything.
 *
 * 6 and 2. A cell has to read as a square you could point at; under about 6px
 * it stops being a mark and becomes texture, which is the floor and is why the
 * *window* shrank rather than the cell when this panel had to fit beside the
 * ranking. The gap is what keeps a run of good days looking like a run of days
 * rather than a solid bar — with no gap, seven Mondays in a row and one long
 * Monday are the same picture.
 *
 * The budget these were checked against: 56 days at pitch 8 is 446px of track,
 * plus the 128px name gutter is 574px of drawing. The narrow half of the
 * two-column layout is 20rem, so the wide half at the page's `max-w-6xl` is
 * about 720px, less the card's own padding — comfortably more, with room for
 * the type to grow.
 */
const CELL = 6;
const GAP = 2;
const PITCH = CELL + GAP;

/** The habit-name gutter, matching `w-32`. Pinned open while the strip scrolls. */
const NAME = 128;

/**
 * The empty grid, drawn as one background rather than one element per day.
 *
 * Eight weeks of a dozen habits is 672 cells and most of them are blank.
 * Rendering the blanks would be hundreds of DOM nodes carrying no information;
 * a repeating gradient at the same pitch draws exactly the same picture in one
 * CSS property, and only the days you actually did anything on become real
 * elements. It mattered more at 365 days and it is still the right shape.
 *
 * `color-mix` against `--ink` rather than a fixed grey, so the empty track
 * flips with the theme for free — `--ink` is near-black in light and near-white
 * in dark, and 7% of either against the page reads as the same faint absence.
 */
const EMPTY_TRACK = `repeating-linear-gradient(to right, color-mix(in srgb, var(--ink) 7%, transparent) 0 ${CELL}px, transparent ${CELL}px ${PITCH}px)`;

/**
 * Every habit's last eight weeks, one row each, a square per day.
 *
 * The thing a month grid can't show. The calendar answers "what did I do on the
 * 14th"; this answers "what does my running actually look like" — the streaks,
 * the three weeks that didn't happen, the habit that quietly stopped. Same
 * data, read along the other axis.
 *
 * **It ignores the range picker, deliberately.** Everything else on this page
 * is filtered by it; this is always the last eight weeks. A density strip needs
 * a fixed span to be comparable with itself from one visit to the next, and the
 * picker's shortest option is a fortnight into a month — fourteen squares is
 * not a picture of anything. The heading prints its own dates so the two panels
 * can't be confused for each other.
 *
 * **It was a rolling year and it scrolled.** Three screens wide meant it had to
 * be a full-bleed band under everything else, which is the layout it has just
 * stopped needing: eight weeks fits beside the ranking, and the two panels are
 * about the same habits — one says which you did most, the other says when. The
 * scroller stays for the narrow case, where it's the honest fallback; the cell
 * size does not shrink to fit, because a two-pixel sliver is not a mark.
 *
 * What was *not* done is GitHub's actual shape — each habit as its own 53×7
 * block — because that stacks a dozen of them down the page and gives up the
 * one thing this layout is for: reading two habits against each other on the
 * same week.
 */
export function HabitHeatmap(props: Props) {
  const scroller = useRef<HTMLDivElement>(null);

  /**
   * Open at the right-hand edge — today — rather than eight weeks ago.
   *
   * A no-op at the width this is designed for, where the whole window fits and
   * there is nothing to scroll. It earns its place on a phone: the newest days
   * are the part you came to look at and the part that would otherwise be the
   * bit off screen. Set rather than animated — this is where the strip
   * *starts*, not somewhere it moves to.
   */
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, []);

  if (props.rows.length === 0 || props.days.length === 0) return null;

  const width = props.days.length * PITCH - GAP;
  const labels = monthLabels(props.days);
  const from = props.days[0];
  const to = props.days[props.days.length - 1];

  return (
    // The same panel as `MostDone`, which is what matters: the two sit side by
    // side as a pair, and one of them framed and the other not reads as one
    // panel with some loose content beside it. Both were rounded white cards
    // until this pass and both are now a rule with content under it — so the
    // pair still agrees, and their two rules line up across the grid's gap.
    <section className={`flex min-w-0 flex-col gap-4 ${PANEL}`}>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        {/* `eyebrow`, down from `text-panel-title`, to match `MostDone`'s
            heading exactly. Two peers in a grid with headings at different
            sizes is a hierarchy the content doesn't have. */}
        <h2 className="eyebrow">Every habit, day by day</h2>
        <p className="tabular text-[0.83rem] text-ink-muted">
          {formatDayShort(from)} — {formatDayShort(to)}
        </p>
      </div>

      <p className="text-[0.83rem] text-ink-muted">
        The last eight weeks, whatever the range above says. A stronger square
        means you placed that sticker more than once on the day.
      </p>

      {/* `aria-hidden` on the whole drawing, with the same justification
          `ChartCard` gives: it is only allowed because the list underneath says
          the same thing in words. The squares are pure position and colour, and
          announcing several hundred of them is not an accessible version of
          this picture, it's a denial of service. */}
      <div
        ref={scroller}
        aria-hidden="true"
        // `pb-2` leaves the scrollbar somewhere to sit that isn't on top of the
        // last row of squares.
        className="overflow-x-auto pb-2"
      >
        <div style={{ width: NAME + width }}>
          {/* Month labels, absolutely placed over the columns they name. They
              can't be a grid row: a label is wider than the 8px column it
              belongs to and would either stretch it or be clipped by it. */}
          <div className="relative mb-1.5 h-4">
            {labels.map((label) => (
              <span
                key={label.index}
                className="eyebrow absolute top-0 whitespace-nowrap"
                style={{ left: NAME + label.index * PITCH }}
              >
                {label.label}
              </span>
            ))}
          </div>

          <div className="flex flex-col gap-1">
            {props.rows.map((row) => (
              <div key={row.activityId} className="flex items-center">
                {/* Pinned to the left edge of the scrollport, for the narrow
                    case where the strip still scrolls. It needs its own opaque
                    background or the squares slide under it and show through,
                    and that background has to be whatever it is lying on: the
                    page's own cream now that the panel has no fill of its own.
                    It was the card's white, and a white band over cream is the
                    exact bug this fixes rather than a different shade of
                    right. */}
                <span className="sticky left-0 z-10 flex w-32 shrink-0 items-baseline gap-2 bg-background pr-4">
                  <span className="min-w-0 truncate text-[0.83rem]">
                    {row.name}
                  </span>
                  <span className="tabular ml-auto text-[0.75rem] text-ink-muted">
                    {row.days}
                  </span>
                </span>

                <span
                  className="relative shrink-0"
                  style={{
                    width,
                    height: CELL,
                    backgroundImage: EMPTY_TRACK,
                  }}
                >
                  {row.counts.map((count, i) => {
                    if (count === 0) return null;
                    const level = heatLevel(count);
                    return (
                      <span
                        key={i}
                        className={`absolute top-0 ${
                          level === 2
                            ? ramp(row.colorKey).bg
                            : ramp(row.colorKey).soft
                        }`}
                        style={{ left: i * PITCH, width: CELL, height: CELL }}
                        // Native `title`, matching the four other hover details
                        // in the app. A tooltip component would be a new
                        // dependency on the page for a hint on a 7px square.
                        title={`${row.name} · ${formatDayLong(props.days[i])}${
                          count > 1 ? ` · ${count} times` : ""
                        }`}
                      />
                    );
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* The strip in words. Not a summary of it — the same facts, in the same
          order, which is what makes hiding the squares honest. */}
      <ul className="sr-only">
        {props.rows.map((row) => (
          <li key={row.activityId}>
            {row.name}: {row.days} of the last {props.days.length} days
            {row.last
              ? `, most recently ${formatDayLong(row.last)}.`
              : ", not once."}
          </li>
        ))}
      </ul>
    </section>
  );
}
