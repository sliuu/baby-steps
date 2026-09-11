"use client";

import { useMemo } from "react";

import { WeekDayColumn } from "./WeekDayColumn";
import type { PeriodProps } from "./period";
import { weekGrid } from "@/lib/dates";
import { dayMatches } from "@/lib/highlight";
import { NO_STICKERS } from "@/lib/stickers";

type Props = PeriodProps & {
  /** Any day inside the week being shown. `weekGrid` finds the Sunday. */
  anchor: Date;
};

/**
 * Seven columns, one week.
 *
 * The same seven tracks as the month grid and the same hairline construction,
 * which is deliberate: this is the month's top row given the whole page. What
 * changes is the height — a column is tall enough to stack a day's stickers as
 * named bars and still leave a note at the bottom — and what a day is allowed
 * to say about itself.
 *
 * No weekday header row. The month grid names its columns once above forty-two
 * cells; seven columns this wide read as seven separate lists, and a label two
 * rows up from a note field isn't naming anything by the time you reach it. So
 * each column says its own weekday, and the header row goes.
 */
export function WeekGrid(props: Props) {
  const days = useMemo(
    () => weekGrid(props.anchor, props.todayString),
    [props.anchor, props.todayString],
  );

  return (
    <div className="overflow-hidden rounded-md border border-hairline bg-hairline">
      <div className="grid grid-cols-7 gap-px">
        {days.map((day) => {
          const stickers = props.stickersByDay.get(day.day) ?? NO_STICKERS;
          const aimed = props.target?.day === day.day;

          return (
            <WeekDayColumn
              key={day.day}
              day={day}
              stickers={stickers}
              onOpen={props.onOpenDay}
              onCommit={props.onCommit}
              highlight={props.highlight}
              over={aimed}
              caretIndex={
                aimed && props.caret && props.target ? props.target.index : null
              }
              lit={props.highlight ? dayMatches(props.highlight, stickers) : false}
              landed={
                props.landed?.day === day.day ? props.landed.activityId : null
              }
            />
          );
        })}
      </div>
    </div>
  );
}
