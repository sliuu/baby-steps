"use client";

import { useMemo } from "react";

import { WeekDayColumn } from "./WeekDayColumn";
import type { PeriodProps } from "./period";
import { weekGrid } from "@/lib/dates";
import { dayMatches } from "@/lib/highlight";
import { RULE } from "@/lib/layout";
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
 *
 * **No box around it, either.** A week is seven columns that are each a page
 * of their own, and a border around them read as a card with seven panels —
 * the outline was doing the work of framing something that didn't need
 * framing, and it was the last thing on the screen with a bottom edge below
 * the notes.
 *
 * This view went first and the rest of the app followed within the hour: the
 * month dropped its own border for the same rule, and Trends dropped five
 * rounded white cards for it. So what is written here as the week's exception
 * is now the house style — see `RULE` and `PANEL` in `lib/layout.ts`, which
 * are this line with a name on it and that line plus the air a heading needs
 * under it. The grids take the first; a Trends panel takes the second.
 *
 * So one rule above and nothing else: `RULE` is the
 * heading's underline and the week's ceiling at once, the seven columns hang
 * off it, and the only other lines are the hairlines dividing the days.
 * `--rule` rather than a hairline because 2px of hairline is a smudge, and a
 * token rather than ink at a slash opacity because those compile with a
 * full-opacity fallback — see the token for that, and note that naming the
 * utility here is enough to emit it. Those are still the 1px
 * grid gaps showing `bg-hairline` through them — same construction as the
 * month, and the reason `bg-background` is on the column rather than nothing
 * at all: a transparent column would show that hairline colour across its
 * whole face, not just in the gaps.
 */
export function WeekGrid(props: Props) {
  const days = useMemo(
    () => weekGrid(props.anchor, props.todayString),
    [props.anchor, props.todayString],
  );

  return (
    <div className={`${RULE} bg-hairline`}>
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
