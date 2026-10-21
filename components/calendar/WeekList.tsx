"use client";

import { useMemo } from "react";

import { MoodDot } from "@/components/ui/Mood";
import { MOOD_LABEL } from "@/lib/moods";
import { StickerMark } from "./StickerMark";
import type { PeriodProps } from "./period";
import { formatDayLong, fromDayString, weekGrid } from "@/lib/dates";
import { dayMatches } from "@/lib/highlight";
import { RULE } from "@/lib/layout";
import { wash } from "@/lib/palette";
import { NO_STICKERS } from "@/lib/stickers";
import { useSettings } from "@/components/SettingsProvider";

type Props = PeriodProps & {
  /** Any day in the week. */
  anchor: Date;
  /** Opens the day's sheet (owned by `CalendarPanel`). */
  onShowDay: (day: Date) => void;
  /** Both phone and desktop render; CSS picks (see `CalendarPanel`). */
  className?: string;
};

/**
 * The week as seven rows, for phones and narrow windows (CSS picks, so a
 * resize swaps it live). Not droppable; a row tap opens the day's sheet.
 * Fixed date and mood slots keep stickers aligned row to row.
 */
export function WeekList(props: Props) {
  const { weekStartsOn } = useSettings();
  const days = useMemo(
    () => weekGrid(props.anchor, props.todayString, weekStartsOn),
    [props.anchor, props.todayString, weekStartsOn],
  );

  const { highlight } = props;
  const faded = (matched: boolean) =>
    highlight && !matched ? "opacity-35" : "";

  const total = days.reduce(
    (sum, day) =>
      sum + (props.stickersByDay.get(day.day)?.activities.length ?? 0),
    0,
  );

  return (
    <div className={props.className}>
      {/* Rule above, hairlines between; no box. */}
      <ul className={RULE}>
        {days.map((day, index) => {
          const stickers = props.stickersByDay.get(day.day) ?? NO_STICKERS;
          const lit = highlight ? dayMatches(highlight, stickers) : false;

          return (
            <li key={day.day}>
              <button
                type="button"
                onClick={() => props.onShowDay(fromDayString(day.day))}
                data-day={day.day}
                // A minimum, not a height: many stickers wrap and the row grows.
                className={`flex min-h-14 w-full items-center gap-s2 px-1 py-s1 text-left transition-colors ${
                  index > 0 ? "border-t border-rule-grid" : ""
                } ${
                  day.isToday
                    ? "bg-secondary"
                    : lit && highlight
                      ? wash(highlight.colorKey)
                      : "hover:bg-secondary/50"
                }`}
              >
                {/* Read first so the row is named as a full date. */}
                <span className="sr-only">{formatDayLong(day.day)}</span>

                <span
                  aria-hidden="true"
                  className="flex w-10 shrink-0 flex-col items-center gap-0.5"
                >
                  <span className="daylabel">{day.weekday}</span>
                  {/* Today: the red rule, as in the other views. */}
                  <time
                    dateTime={day.day}
                    className={`oldstyle grid size-7 place-items-center border-b-2 text-ui ${
                      day.isToday ? "border-ink font-medium" : "border-transparent"
                    }`}
                  >
                    {day.dayOfMonth}
                  </time>
                </span>

                <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                  {stickers.activities.map((sticker) => (
                    <StickerMark
                      key={sticker.activityId}
                      sticker={sticker}
                      className={faded(
                        highlight?.activityIds.has(sticker.activityId) ?? false,
                      )}
                    />
                  ))}
                </span>

                <span className="flex w-6 shrink-0 justify-end">
                  {stickers.mood && (
                    <span className={faded(highlight?.mood === stickers.mood)}>
                      <MoodDot mood={stickers.mood} />
                      <span className="sr-only">Mood: {MOOD_LABEL[stickers.mood]}</span>
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <p className="mt-s2 text-label text-ink-muted">
        {total === 0
          ? "A quiet week so far. Tap a day to put something on it."
          : `${total} sticker${total === 1 ? "" : "s"} this week. Tap a day to add one.`}
      </p>
    </div>
  );
}
