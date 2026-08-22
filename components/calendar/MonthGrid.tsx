"use client";

import { useMemo, useState, useSyncExternalStore } from "react";

import { DayCell } from "./DayCell";
import { MonthHeader } from "./MonthHeader";
import {
  fromMonthString,
  monthGrid,
  stepMonth,
  today,
  toMonthString,
  weekdayLabels,
  type DayString,
} from "@/lib/dates";
import { dayMatches, type Highlight } from "@/lib/highlight";
import { NO_STICKERS, type StickersByDay } from "@/lib/stickers";

type Props = {
  /** "2026-08", computed on the server so first paint isn't blank. */
  initialMonth: string;
  /**
   * Fetched once on the server, for every month at once. That's why arrowing to
   * September is instant and needs no request — the data for it is already here.
   */
  stickersByDay: StickersByDay;
  /** Passed straight through to every cell. The grid itself owns no selection. */
  onOpenDay: (day: DayString) => void;
  /**
   * The resolved selection, or null. Also not owned here — it belongs to the
   * board, because the tray is what sets it and the tray is the grid's sibling.
   */
  highlight: Highlight | null;
};

/** Today never changes mid-session, so there is nothing to subscribe to. */
const noSubscription = () => () => {};

/**
 * Owns one piece of state: which month you're looking at. The 42 cells are
 * *derived* from it, never stored alongside it — two things that must agree
 * eventually won't.
 *
 * The awkward part is the clock. This component renders twice: once on the
 * server, then again in the browser to hydrate. Reading `new Date()` during
 * render would let those two runs disagree — a server in UTC and a browser in
 * California are on different dates for seven hours out of every day — and
 * React would hydrate against markup that doesn't match.
 *
 * `useSyncExternalStore` exists for exactly this. Its third argument is the
 * value to use on the server *and during hydration*; the second is the real
 * client value, which React switches to immediately afterwards. So the first
 * paint is deliberately today-less, and no cell is wrongly marked.
 */
export function MonthGrid(props: Props) {
  const todayString = useSyncExternalStore(
    noSubscription,
    () => today(), // browser: the visitor's own date
    () => null, // server and hydration: we don't know yet
  );

  // Null until an arrow is pressed. While it's null the grid follows the clock,
  // so a visitor who leaves the tab open overnight isn't stranded in last month.
  const [chosenMonth, setChosenMonth] = useState<Date | null>(null);

  const month = useMemo(() => {
    if (chosenMonth) return chosenMonth;
    return fromMonthString(todayString?.slice(0, 7) ?? props.initialMonth);
  }, [chosenMonth, todayString, props.initialMonth]);

  const cells = useMemo(() => monthGrid(month, todayString), [month, todayString]);
  const labels = useMemo(() => weekdayLabels(), []);

  return (
    <section className="flex flex-col gap-8" data-month={toMonthString(month)}>
      <MonthHeader
        month={month}
        onStep={(by) => setChosenMonth(stepMonth(month, by))}
      />

      {/* The hairlines are the 1px gaps, showing the container's background
          through them. One rule instead of per-cell borders that double up. */}
      <div className="overflow-hidden rounded-md border border-hairline bg-hairline">
        <div className="grid grid-cols-7 gap-px">
          {labels.map((label) => (
            <div
              key={label}
              className="eyebrow bg-surface py-3 text-center"
            >
              {label}
            </div>
          ))}

          {cells.map((cell) => {
            // One lookup per cell. A shared empty value rather than a fresh
            // object each time, so an empty day's props stay referentially
            // equal between renders and React can skip the work.
            const stickers = props.stickersByDay.get(cell.day) ?? NO_STICKERS;

            return (
              <DayCell
                key={cell.day}
                cell={cell}
                stickers={stickers}
                onOpen={props.onOpenDay}
                highlight={props.highlight}
                // The cell is told whether it's lit; it never works it out. The
                // stickers are already in hand from the lookup above, so asking
                // here costs nothing and keeps the rule in one function that a
                // test can reach.
                lit={
                  props.highlight
                    ? dayMatches(props.highlight, stickers)
                    : false
                }
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
