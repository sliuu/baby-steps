"use client";

import { useMemo } from "react";

import { MoodMark } from "./MoodMark";
import { StickerMark } from "./StickerMark";
import type { PeriodProps } from "./period";
import { formatDayLong, fromDayString, weekGrid } from "@/lib/dates";
import { dayMatches } from "@/lib/highlight";
import { RULE } from "@/lib/layout";
import { wash } from "@/lib/palette";
import { NO_STICKERS } from "@/lib/stickers";

type Props = PeriodProps & {
  /** Any day inside the week being shown. `weekGrid` finds the Sunday. */
  anchor: Date;
  /** Open one day. `CalendarPanel` moves the anchor and asks for Today. */
  onShowDay: (day: Date) => void;
  /**
   * Which widths this drawing is for. `CalendarPanel` renders both the phone's
   * and the desktop's and lets CSS choose — see the note on the branch there.
   */
  className?: string;
};

/**
 * The week as seven rows, for a phone.
 *
 * `WeekGrid` turned on its side, and turning it is the whole idea: seven
 * columns each holding a stack of named bars and a note field is a comparison
 * laid out across a page, and a 375px page has no across. Rotated, the seven
 * days become seven lines you read top to bottom — which is the direction a
 * phone already scrolls — and each line is short enough to say the one thing a
 * week is for: was there anything on this day, and how did it feel.
 *
 * It is chosen by window width rather than by section — `CalendarPanel` renders
 * this and `WeekGrid` together and lets `lg:hidden` pick — so a narrow
 * *desktop* window gets it too, and that is deliberate for the same reason the
 * day view is available at every width: a view that exists at one size and not
 * another is a view you can be stranded in by dragging a window. Dragging the
 * window is also why the choice is CSS rather than a hook: a resize crosses
 * the breakpoint mid-session with no re-render to wait for.
 *
 * The cost is that a narrow window's tray can no longer drop onto the week,
 * because there is nothing droppable in here. That is the trade the phone was
 * always going to make, and the way in is a tap now.
 *
 * **What it gives up, said plainly.** Names, notes, and ordering. A sticker is
 * a circle here rather than a named bar, because seven rows of named bars is
 * the column stack again with the same width problem; the names come back the
 * moment you tap through to the day. The note is not on the row at all — a
 * week of notes is seven paragraphs, which is a different screen. And nothing
 * in here is draggable, so there are no slots and no caret.
 *
 * **A row is one tap target and it opens the day.** Not a sheet, and not
 * remove-on-tap: the day view is already the place this app adds and removes
 * things, it is one tap away, and it is a whole screen rather than a 32px
 * circle next to six of its neighbours. So the week is a way of finding a day,
 * and the day is where you change it. That also means a row has exactly one
 * gesture — there is nothing on it you can press by mistake and undo.
 *
 * The date column is 40px and fixed, so the seven numerals line up down the
 * left edge and the sticker areas all start at the same x. The mood is on the
 * right in a slot of its own, kept whether or not there is a face in it, for
 * the same reason: a row with a mood and a row without have to be the same
 * shape or the stickers shuffle sideways from line to line.
 */
export function WeekList(props: Props) {
  const days = useMemo(
    () => weekGrid(props.anchor, props.todayString),
    [props.anchor, props.todayString],
  );

  const { highlight } = props;
  /** The same fade every other view puts on what a selection didn't match. */
  const faded = (matched: boolean) =>
    highlight && !matched ? "opacity-35" : "";

  const total = days.reduce(
    (sum, day) =>
      sum + (props.stickersByDay.get(day.day)?.activities.length ?? 0),
    0,
  );

  return (
    <div className={props.className}>
      {/* One rule above and hairlines between, which is the house grammar —
          see `RULE`. No box: the rows are already seven bands of full page
          width, and an outline round them would be the card the week gave up
          two steps ago. */}
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
                // 3.5rem is 56px, a comfortable row above the 44px floor, and
                // it is a minimum rather than a height: a day with nine
                // stickers wraps to a second line of circles and the row grows
                // to hold them.
                className={`flex min-h-14 w-full items-center gap-3 px-1 py-2.5 text-left transition-colors ${
                  index > 0 ? "border-t border-hairline" : ""
                } ${
                  day.isToday
                    ? "bg-secondary"
                    : lit && highlight
                      ? wash(highlight.colorKey)
                      : "hover:bg-ink/2"
                }`}
              >
                {/* The visible date is two pieces of typography and reads as
                    "Sun 13" out loud, which is not how anyone says a date. The
                    sentence below is what a screen reader gets instead, and it
                    is first in the flow so the row is named before its
                    contents are listed. */}
                <span className="sr-only">{formatDayLong(day.day)}</span>

                <span
                  aria-hidden="true"
                  className="flex w-10 shrink-0 flex-col items-center gap-0.5"
                >
                  <span className="daylabel">{day.weekday}</span>
                  {/* The ring, not a fill, exactly as in the other two views —
                      and here it is the only thing besides the row's own tint
                      that says which day is today. */}
                  <time
                    dateTime={day.day}
                    className={`oldstyle grid size-7 place-items-center rounded-full text-[0.95rem] ${
                      day.isToday ? "font-medium ring-1 ring-ink" : ""
                    }`}
                  >
                    {day.dayOfMonth}
                  </time>
                </span>

                <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                  {stickers.activities.length > 0 ? (
                    stickers.activities.map((sticker) => (
                      <StickerMark
                        key={sticker.activityId}
                        sticker={sticker}
                        className={faded(
                          highlight?.activityIds.has(sticker.activityId) ??
                            false,
                        )}
                      />
                    ))
                  ) : (
                    /* "Quiet", and not "No stickers" or an empty row. A week
                       with four blank days should read as a week with four
                       quiet days — the word is there to say that nothing
                       happening is a thing that happened, which is the one
                       claim this app is careful to keep making.

                       Not italic, although it wants to be. The app loads one
                       style of DM Sans and one weight of Instrument Serif, so
                       an italic here would be the browser shearing an upright
                       face — and a synthesised oblique at 13px is a smudge,
                       not a voice. Muted is the whole treatment. */
                    <span className="text-[0.83rem] text-ink-muted">Quiet</span>
                  )}
                </span>

                <span className="flex w-6 shrink-0 justify-end">
                  {stickers.mood && (
                    <span className={faded(highlight?.mood === stickers.mood)}>
                      <MoodMark mood={stickers.mood} />
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-[0.83rem] text-ink-muted">
        {total === 0
          ? "A quiet week so far. Tap a day to put something on it."
          : `${total} sticker${total === 1 ? "" : "s"} this week. Tap a day to add one.`}
      </p>
    </div>
  );
}
