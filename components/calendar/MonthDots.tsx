"use client";

import { useMemo } from "react";

import { StickerMark } from "./StickerMark";
import type { PeriodProps } from "./period";
import { formatDayLong, fromDayString, monthGrid, weekdayLabels } from "@/lib/dates";
import type { DayString } from "@/lib/dates";
import { dayMatches } from "@/lib/highlight";
import { RULE } from "@/lib/layout";
import { monthSummary } from "@/lib/monthSummary";
import { ramp, wash } from "@/lib/palette";
import type { LibraryGroup } from "@/lib/queries/activities";
import { NO_STICKERS } from "@/lib/stickers";

/**
 * How many dots a cell will draw before it stops counting.
 *
 * Four, and the cap is silent — no "+2", no smaller dots to fit. A 44px cell
 * can hold four 5px dots on one line with air around them; five is a second
 * line and a cell that is taller than its neighbours. What the dots are for is
 * "something happened here, in these colours", and the fifth dot does not
 * change that answer. The exact count is one tap away and it is spelled out in
 * words there.
 */
const DOT_CAP = 4;

type Props = PeriodProps & {
  /** The first of the month being shown. */
  month: Date;
  /** The library, for the activity-to-area map the summary counts through. */
  groups: LibraryGroup[];
  /** Open one day. `CalendarPanel` moves the anchor and asks for Today. */
  onShowDay: (day: Date) => void;
  /**
   * Which widths this drawing is for. `CalendarPanel` renders both the phone's
   * and the desktop's and lets CSS choose — see the note on the branch there.
   */
  className?: string;
};

/**
 * The month as a dot grid, for a phone.
 *
 * `MonthGrid` is forty-two cells that each hold named, draggable marks; at
 * 375px each of those cells is 45px wide, which is narrower than one sticker
 * plus its padding. So the marks come out and what stays is the thing a month
 * is actually read for: the shape of the month. Seven columns, six rows, and up
 * to four coloured dots per day — a picture of which days have something on
 * them and roughly what kind, taken in at a glance and never read one cell at a
 * time.
 *
 * **The dots are not stickers, and the difference is the point.** A sticker is
 * a 26px circle with a mark in it and a name in it, and it is a drag handle.
 * A dot is 5px of hue with no mark, no name and no gesture of its own. Shrinking
 * the sticker would have given a 14px circle whose icon is a smudge and whose
 * drag target is under the touch floor — a control that looks like a control and
 * cannot be operated. Dropping to a dot says plainly that this drawing is
 * evidence rather than a set of handles, and puts every gesture on the cell.
 *
 * So the cell is the tap target, it is the whole cell, and it opens the day —
 * the same bargain `WeekList` makes, for the same reason: the day view is where
 * this app adds and removes things, and it is one tap from here.
 *
 * **The summary underneath is not decoration, it is the other half of the
 * view.** The desktop month says how the month went by letting you read
 * forty-two cells of named marks. Dots can't do that — they carry a hue and
 * nothing else — so the sentences that a wide screen gets for free have to be
 * written out: how many days were marked, how many stickers, how many areas,
 * and the three habits that came round most. That is `monthSummary`, and it is
 * a pure function in `lib/` so it can be tested without a browser.
 *
 * Chosen by window width rather than by section — `CalendarPanel` renders this
 * and `MonthGrid` together and lets `lg:hidden` pick — so a narrow desktop
 * window gets it too. The cost is the same one the week pays: there is nothing
 * droppable in here, so a narrow window's tray cannot reach the month.
 */
export function MonthDots(props: Props) {
  const cells = useMemo(
    () => monthGrid(props.month, props.todayString),
    [props.month, props.todayString],
  );

  const labels = useMemo(() => weekdayLabels(), []);

  /** The month's own days — the borrowed ones at each end are not counted. */
  const ownDays = useMemo<DayString[]>(
    () => cells.filter((cell) => cell.inMonth).map((cell) => cell.day),
    [cells],
  );

  /**
   * Activity to life area, built from the library.
   *
   * Here rather than in `monthSummary` because the summary is a pure function
   * over data and this is a reshape of a prop — and because the map is stable
   * across every render where the library hasn't changed, while the summary is
   * recomputed whenever a sticker moves.
   */
  const areaOf = useMemo(() => {
    const map = new Map<string, string>();
    for (const group of props.groups) {
      for (const sticker of group.stickers) map.set(sticker.id, group.areaName);
    }
    return map;
  }, [props.groups]);

  const summary = useMemo(
    () => monthSummary(ownDays, props.stickersByDay, areaOf, props.todayString),
    [ownDays, props.stickersByDay, areaOf, props.todayString],
  );

  const { highlight } = props;
  /** The same fade every other view puts on what a selection didn't match. */
  const faded = (matched: boolean) =>
    highlight && !matched ? "opacity-35" : "";

  return (
    <div className={`flex flex-col gap-5 ${props.className ?? ""}`}>
      <div>
        {/* The header row is inside the same grid as the cells, so the seven
            labels sit over the seven columns by construction rather than by two
            `grid-cols-7` that happen to agree.

            "Sun" and not "S". The handoff cuts the labels to one letter, and
            the reason not to follow it is already written down in `daylabel`:
            `format(…, "EEE")` hands over a word, and a word is read in one beat
            where a letter is reassembled into one. Three characters of Space
            Mono at 0.65rem is about 19px in a 45px column, so the width that
            would have forced the cut isn't actually short. */}
        <div className={`grid grid-cols-7 gap-[3px] ${RULE} pt-2`}>
          {labels.map((label) => (
            <div key={label} className="daylabel pb-1 text-center">
              {label}
            </div>
          ))}

          {cells.map((cell) => {
            const stickers = props.stickersByDay.get(cell.day) ?? NO_STICKERS;
            const lit = highlight ? dayMatches(highlight, stickers) : false;

            return (
              <button
                key={cell.day}
                type="button"
                onClick={() => props.onShowDay(fromDayString(cell.day))}
                data-day={cell.day}
                // A borrowed day is dimmed rather than blanked: it is still a
                // real day you can open, and the two rows at the ends of the
                // grid are where a habit that runs over a month boundary
                // actually lives.
                className={`flex h-11 flex-col items-center justify-center gap-1 rounded-lg transition-colors ${
                  cell.inMonth ? "" : "opacity-40"
                } ${
                  cell.isToday
                    ? "bg-secondary"
                    : lit && highlight
                      ? wash(highlight.colorKey)
                      : "hover:bg-ink/2"
                }`}
              >
                {/* Two visual pieces that read as "13" plus some colour, which
                    is not a date. The sentence is what a screen reader gets. */}
                <span className="sr-only">{formatDayLong(cell.day)}</span>

                <time
                  aria-hidden="true"
                  dateTime={cell.day}
                  className={`oldstyle text-[0.95rem] leading-none ${
                    cell.isToday ? "font-medium" : ""
                  }`}
                >
                  {cell.dayOfMonth}
                </time>

                {/* The row keeps its 5px whether or not there is anything in
                    it, so the numerals sit on one line across all six rows. A
                    grid where the empty days' numbers float lower than the
                    marked ones is a grid you read cell by cell. */}
                <span
                  aria-hidden="true"
                  className="flex h-[5px] max-w-[2.125rem] flex-wrap items-center justify-center gap-[2px]"
                >
                  {stickers.activities.slice(0, DOT_CAP).map((sticker) => (
                    <span
                      key={sticker.id}
                      className={`size-[5px] rounded-full ${ramp(sticker.colorKey).bg} ${faded(
                        highlight?.activityIds.has(sticker.activityId) ?? false,
                      )}`}
                    />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <MonthReadout summary={summary} />
    </div>
  );
}

/**
 * What the dots can't say, said in words.
 *
 * Three figures and up to three habits, drawn in the house grammar — a rule, an
 * eyebrow, and the content against the page's own cream. The handoff puts the
 * figures in three filled rounded cards, and the argument against that is the
 * one already written in `PANEL`: a filled box claims something separate is
 * going on inside it, and these three numbers are one sentence about one month.
 */
function MonthReadout(props: { summary: ReturnType<typeof monthSummary> }) {
  const { summary } = props;

  return (
    <div className={`${RULE} flex flex-col gap-4 pt-4`}>
      <div className="flex flex-col gap-2">
        <h2 className="eyebrow text-ink-label">This month so far</h2>

        <div className="flex items-end gap-6">
          <Figure value={summary.daysMarked} label="days marked" />
          <Figure value={summary.stickers} label="stickers" />
          <Figure value={summary.areas} label="areas touched" />
        </div>
      </div>

      {summary.leaders.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="eyebrow text-ink-label">Most marked</h2>

          <ul className="flex flex-col">
            {summary.leaders.map((leader, index) => (
              <li
                key={leader.activityId}
                className={`flex items-center gap-3 py-2 ${
                  index > 0 ? "border-t border-hairline" : ""
                }`}
              >
                <StickerMark sticker={leader} />

                <span className="min-w-0 flex-1 truncate text-[0.95rem]">
                  {leader.name}
                </span>

                {/* The count is the fact and the cadence is the reading of it,
                    so they are not the same size or the same colour. The
                    cadence is the softer of the two on purpose: it is an
                    approximation and it should look like one. */}
                <span className="tabular shrink-0 text-[0.83rem] text-ink-muted">
                  {leader.count}×
                </span>
                <span className="shrink-0 text-[0.83rem] text-ink-muted">
                  {leader.cadence}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-[0.83rem] text-ink-muted">
        {summary.daysMarked === 0
          ? "Nothing on the month yet. Tap a day to put something on it."
          : `${summary.daysMarked} of ${summary.elapsed} days so far. Tap a day to add to it.`}
      </p>
    </div>
  );
}

/** One of the three figures: a big oldstyle number over a small caption. */
function Figure(props: { value: number; label: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="oldstyle font-heading text-[1.75rem] leading-none">
        {props.value}
      </span>
      <span className="text-[0.78rem] text-ink-muted">{props.label}</span>
    </div>
  );
}
