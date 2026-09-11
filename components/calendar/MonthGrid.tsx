"use client";

import { useMemo } from "react";

import { DayCell } from "./DayCell";
import type { PeriodProps } from "./period";
import { monthGrid, weekdayLabels } from "@/lib/dates";
import { dayMatches } from "@/lib/highlight";
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
    <div className="overflow-hidden rounded-md border border-hairline bg-hairline">
      <div className="grid grid-cols-7 gap-px">
        {labels.map((label) => (
          <div key={label} className="daylabel bg-surface py-2 text-center">
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
