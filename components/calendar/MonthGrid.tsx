"use client";

import { useMemo } from "react";

import { DayCell } from "./DayCell";
import { isFuture, type PeriodProps } from "./period";
import { monthGrid, weekdayLabels } from "@/lib/dates";
import { dayMatches } from "@/lib/highlight";
import { NO_STICKERS } from "@/lib/stickers";
import { cn } from "@/lib/utils";
import { useSettings } from "@/components/SettingsProvider";

type Props = PeriodProps & {
  /** The first of the month. */
  month: Date;
  className?: string;
};

/** Six weeks, inside lines only: the 1px gaps show `rule-grid` through. */
export function MonthGrid(props: Props) {
  const { weekStartsOn } = useSettings();
  const cells = useMemo(
    () => monthGrid(props.month, props.todayString, weekStartsOn),
    [props.month, props.todayString, weekStartsOn],
  );
  const labels = useMemo(() => weekdayLabels(weekStartsOn), [weekStartsOn]);

  return (
    <div className={cn("grid grid-cols-7 gap-px bg-rule-grid", props.className)}>
      {labels.map((label) => (
        <div key={label} className="bg-paper pb-s1 text-center text-caption text-ink-muted lowercase">
          {label}
        </div>
      ))}

      {cells.map((cell) => {
        const stickers = props.stickersByDay.get(cell.day) ?? NO_STICKERS;
        const aimed = props.target?.day === cell.day;
        return (
          <DayCell
            key={cell.day}
            day={cell.day}
            dayOfMonth={cell.dayOfMonth}
            inMonth={cell.inMonth}
            isToday={cell.isToday}
            future={isFuture(cell.day, props.todayString)}
            selected={props.selectedDay === cell.day}
            onSelect={props.onOpenDay}
            stickers={stickers}
            highlight={props.highlight}
            lit={props.highlight ? dayMatches(props.highlight, stickers) : false}
            over={aimed}
            caretIndex={aimed && props.caret && props.target ? props.target.index : null}
            landed={props.landed?.day === cell.day ? props.landed.activityId : null}
          />
        );
      })}
    </div>
  );
}
