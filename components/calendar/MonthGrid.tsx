"use client";

import { useMemo } from "react";

import { DayCell } from "./DayCell";
import type { PeriodProps } from "./period";
import { monthGrid, weekdayLabels } from "@/lib/dates";
import { dayMatches } from "@/lib/highlight";
import { RULE } from "@/lib/layout";
import { NO_STICKERS } from "@/lib/stickers";

type Props = PeriodProps & {
  /** The first of the month being shown. `CalendarPanel` derives it. */
  month: Date;
};

/**
 * Forty-two cells, six rows, always.
 *
 * Purely derived now — the month arrives as a prop and the cells come out of
 * `monthGrid`. It used to own the month, the clock and the deck animation as
 * well; those moved up to `CalendarPanel` when the week strip appeared, since
 * all three are answers to "which period am I looking at" and there are now
 * two views asking.
 */
export function MonthGrid(props: Props) {
  const cells = useMemo(
    () => monthGrid(props.month, props.todayString),
    [props.month, props.todayString],
  );
  const labels = useMemo(() => weekdayLabels(), []);

  return (
    // The hairlines are the 1px gaps, showing the container's background
    // through them. One rule instead of per-cell borders that double up.
    //
    // Which is also why the cells are `bg-background` rather than nothing at
    // all now that the month has no surface of its own: this background is
    // painted behind the whole grid, so a transparent cell shows hairline
    // colour across its whole face instead of only in the 1px gaps. "No
    // background" means the cells are the page's cream, not that they have
    // none — and `wash()` still needs something opaque underneath it either
    // way.
    //
    // **The box around the forty-two went too**, and the argument that kept it
    // one pass ago — they are one object, six rows of a month, and the border
    // is what says where the month ends — lost to the thing next door. The
    // week had already given up its outline for a single rule above, and two
    // views of the same seven columns drawn in two different chrome languages
    // is worse than either language: switching Month/Week made the page's
    // frame appear and disappear. So the month keeps the part that was doing
    // real work, which is the hairline grid, and loses the part that was only
    // saying "this is a card". What is left is exactly the week's grammar:
    // thick rule above, thin lines between, no sides and no bottom. The
    // radius went with the border — there is no box left to round, and a
    // rounded corner with no edge to turn is just a clipped cell.
    <div className={`${RULE} bg-hairline`}>
      <div className="grid grid-cols-7 gap-px">
        {labels.map((label) => (
          <div key={label} className="daylabel bg-background py-2 text-center">
            {label}
          </div>
        ))}

        {cells.map((cell) => {
          // One lookup per cell. A shared empty value rather than a fresh
          // object each time, so an empty day's props stay referentially
          // equal between renders and React can skip the work.
          const stickers = props.stickersByDay.get(cell.day) ?? NO_STICKERS;
          const aimed = props.target?.day === cell.day;

          return (
            <DayCell
              key={cell.day}
              cell={cell}
              stickers={stickers}
              onOpen={props.onOpenDay}
              onCommit={props.onCommit}
              highlight={props.highlight}
              over={aimed}
              caretIndex={
                aimed && props.caret && props.target ? props.target.index : null
              }
              // The cell is told whether it's lit; it never works it out.
              // The stickers are already in hand from the lookup above, so
              // asking here costs nothing and keeps the rule in one
              // function that a test can reach.
              lit={
                props.highlight ? dayMatches(props.highlight, stickers) : false
              }
              // Non-null only for the mark that was just placed, and only
              // for about half a second. See `CalendarBoard.landed`.
              landed={
                props.landed?.day === cell.day ? props.landed.activityId : null
              }
            />
          );
        })}
      </div>
    </div>
  );
}
