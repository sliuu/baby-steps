"use client";

import { useMemo } from "react";

import { DayCell } from "./DayCell";
import { isFuture, type PeriodProps } from "./period";
import { weekGrid } from "@/lib/dates";
import { dayMatches } from "@/lib/highlight";
import { NO_STICKERS } from "@/lib/stickers";
import { cn } from "@/lib/utils";

type Props = PeriodProps & {
  /** Any day in the week. */
  anchor: Date;
  className?: string;
};

/** One week: the month's cell, taller. */
export function WeekGrid(props: Props) {
  const days = useMemo(
    () => weekGrid(props.anchor, props.todayString),
    [props.anchor, props.todayString],
  );

  return (
    <div className={cn("grid grid-cols-7 gap-px bg-rule-grid", props.className)}>
      {days.map((day) => (
        <div key={day.day} className="bg-paper pb-2 text-center text-caption text-ink-muted lowercase">
          {day.weekday}
        </div>
      ))}

      {days.map((day) => {
        const stickers = props.stickersByDay.get(day.day) ?? NO_STICKERS;
        const aimed = props.target?.day === day.day;
        return (
          <DayCell
            key={day.day}
            day={day.day}
            dayOfMonth={day.dayOfMonth}
            isToday={day.isToday}
            future={isFuture(day.day, props.todayString)}
            selected={props.selectedDay === day.day}
            onSelect={props.onOpenDay}
            stickers={stickers}
            highlight={props.highlight}
            lit={props.highlight ? dayMatches(props.highlight, stickers) : false}
            over={aimed}
            caretIndex={aimed && props.caret && props.target ? props.target.index : null}
            landed={props.landed?.day === day.day ? props.landed.activityId : null}
            className="min-h-80"
          />
        );
      })}
    </div>
  );
}
