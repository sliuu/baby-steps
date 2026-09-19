"use client";

import { useDroppable } from "@dnd-kit/core";
import { Plus, X } from "lucide-react";
import { useMemo } from "react";

import { DayNote } from "./DayNote";
import { MoodRow } from "./MoodRow";
import { StickerBar } from "./StickerBar";
import type { PeriodProps } from "./period";
import {
  formatDayLong,
  formatDayTitle,
  formatWeekdayLong,
  fromDayString,
  toDayString,
  weekGrid,
} from "@/lib/dates";
import { dayMatches } from "@/lib/highlight";
import { PAGE_TITLE } from "@/lib/layout";
import { ramp, wash } from "@/lib/palette";
import { cn } from "@/lib/utils";
import { NO_STICKERS } from "@/lib/stickers";

type Props = PeriodProps & {
  /** The day on show. `CalendarPanel` owns it; this reports taps back. */
  anchor: Date;
  onPickDay: (day: Date) => void;
  /**
   * Open the sticker sheet on this day. `CalendarPanel` owns it, because the
   * week list and the month dots open the same one — see `DaySheet`.
   */
  onAddSticker: () => void;
  /**
   * Which widths this drawing is for. `CalendarPanel` renders both the phone's
   * landing and the desktop's and lets CSS choose — see the note on the branch
   * there.
   */
  className?: string;
};

/** The most dots a strip cell draws before it stops counting. */
const MAX_DOTS = 4;

/**
 * One day, top to bottom. The phone's home screen, and the third calendar.
 *
 * **Why a third view rather than a narrow week.** A week strip is seven
 * columns of named bars; the month is forty-two cells. Both are *comparisons*,
 * and a comparison needs the things being compared side by side — which is the
 * one thing a 375px screen cannot give you. Squeezing either down produces a
 * screen where nothing is legible and nothing is comparable, so this stops
 * trying: one day gets the whole width, the week above it shrinks to a row of
 * dates you can tap, and the comparison becomes navigation.
 *
 * That makes it a genuinely different reading of the same data rather than a
 * responsive breakpoint, which is why it is a section in the nav and available
 * at every width. A wide window shows it beside the tray like any other view.
 *
 * **It is a tap surface, not a drag surface, and the stickers are plain
 * `StickerBar`s to prove it.** The week strip's bars are `DraggableMark`s and
 * carry `touch-none` — which is what lets dnd-kit own the gesture, and on a
 * phone also means a finger that lands on a sticker cannot scroll the page.
 * A column of full-width bars is most of this screen, so drag-to-remove here
 * would cost the page its scroll. The × beside each bar does that job instead,
 * and does it in one tap rather than a drag to nowhere.
 *
 * **The five faces are here and not in the tray below.** The tray's mood row
 * is hidden under `lg`, because on a phone the whole page is one column and
 * the two rows end up on the same scroll — the same five faces asking to be
 * pressed twice. This is the copy that stays: it is next to the date it
 * records, and it says how it felt rather than filtering by it.
 *
 * **Adding one happens in a sheet, not in here.** The tray is a drag source,
 * and a drag is the gesture this screen can't take. What replaced it was an
 * inline chip list that unfolded under the add button, and what replaced *that*
 * is `DaySheet` — the same picker the week list and the month dots now open, so
 * there is one answer to "what can go on a day" instead of two. The inline list
 * had to show only what was *not* already here, because the bars above it were
 * the placed half; the sheet shows the whole library with the placed ones
 * ticked, which is a rule you can state without pointing at the rest of the
 * screen.
 *
 * What stays here is the day itself: the bars with their ×, the five faces, and
 * the note. Everything on this screen is something you have; the sheet is
 * everything you could have.
 *
 * The stickers section is still a *drop target*, because on a wide screen the
 * tray is right there and dropping onto the day you are reading is the obvious
 * gesture. There are no `DropSlot`s in it: a drop with no slot under it lands
 * at the end of the day, which is the only ordering this view offers and the
 * honest one for a list you can't drag within — and the same index the chips
 * below place at.
 */
export function TodayView(props: Props) {
  const day = toDayString(props.anchor);
  const stickers = props.stickersByDay.get(day) ?? NO_STICKERS;

  const week = useMemo(
    () => weekGrid(props.anchor, props.todayString),
    [props.anchor, props.todayString],
  );

  const { setNodeRef } = useDroppable({ id: day });

  const { highlight } = props;
  /** The fade a highlight puts on everything it didn't select. */
  const faded = (matched: boolean) =>
    highlight && !matched ? "opacity-35" : "";

  // No `PANEL` on the three sections below, which is a departure from every
  // other page in the app and the one worth arguing for. A panel is a heading
  // with a thick rule over it, and it means "a new thing starts here" — right
  // when a page has two or three of them spread across 1536px. Stacked down a
  // 375px screen the same three rules land within 600px of each other and the
  // page reads as a form. What separates things here is space and a label,
  // which is what a single column has instead of a layout.
  return (
    <section className={cn("flex flex-col gap-9", props.className)}>
      <header>
        <p className="eyebrow">{formatWeekdayLong(day)}</p>
        {/* `leading-[1.25]` with the extra pulled back off as negative margin,
            for the reason `PeriodHeader` documents: this size sets a line box
            no taller than the em, and Instrument Serif's descenders hang below
            it. "13 September" has a p in it. */}
        <h1 className={`-my-[0.125em] mt-1 leading-[1.25] ${PAGE_TITLE}`}>
          {formatDayTitle(day)}
        </h1>
      </header>

      {/* The week around the day, as seven tap targets.
          A grid rather than a scroller: seven is a number that fits, and a row
          that scrolls sideways hides the fact that a week has ends. */}
      <div>
        <div className="grid grid-cols-7 gap-1">
          {week.map((cell) => {
            const cellStickers =
              props.stickersByDay.get(cell.day) ?? NO_STICKERS;
            const shown = cell.day === day;
            const lit = highlight ? dayMatches(highlight, cellStickers) : false;

            return (
              <button
                key={cell.day}
                type="button"
                onClick={() => props.onPickDay(fromDayString(cell.day))}
                aria-current={shown ? "date" : undefined}
                aria-label={formatDayLong(cell.day)}
                className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg transition-colors ${
                  shown
                    ? "bg-secondary"
                    : lit && highlight
                      ? wash(highlight.colorKey)
                      : "hover:bg-ink/5"
                }`}
              >
                <span className="daylabel">{cell.weekday}</span>
                {/* Today is a ring, the day on show is the filled box behind
                    all of this, and the two are different questions — "which
                    day is it" and "which day am I reading". On the day they
                    agree you get both, correct rather than doubled. */}
                <time
                  dateTime={cell.day}
                  className={`oldstyle grid size-7 place-items-center rounded-full text-[0.875rem] ${
                    cell.isToday ? "font-medium ring-1 ring-ink" : ""
                  }`}
                >
                  {cell.dayOfMonth}
                </time>
                {/* A dot per sticker, in its own hue, capped. The row is
                    rendered even when empty so the seven cells stay the same
                    height and the numerals sit on one line. */}
                <span
                  aria-hidden="true"
                  className="flex h-1 items-center gap-0.5"
                >
                  {cellStickers.activities.slice(0, MAX_DOTS).map((sticker) => (
                    <span
                      key={sticker.activityId}
                      className={`size-1 rounded-full ${ramp(sticker.colorKey).bg}`}
                    />
                  ))}
                </span>
              </button>
            );
          })}
        </div>

      </div>

      <section>
        <h2 className="eyebrow">How it felt</h2>

        <div className="mt-3">
          <MoodRow
            day={day}
            mood={stickers.mood}
            onCommit={props.onCommit}
            highlight={highlight}
          />
        </div>
      </section>

      <section ref={setNodeRef} className="relative">
        {/* The drop outline, bled past the section's edges so it reads as a
            band the sticker is landing in rather than as a box drawn round the
            heading. Same treatment as a week column's, one level in. */}
        {props.target?.day === day && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-2 border-2 border-ink/40 bg-ink/6"
          />
        )}

        <h2 className="eyebrow">Stickers</h2>

        <ul className="mt-3 flex flex-col gap-2">
          {stickers.activities.map((sticker) => (
            <li key={sticker.activityId} className="flex items-center gap-1">
              <StickerBar
                sticker={sticker}
                // Taller than the week strip's bar and set a rung larger. A
                // column 100px wide is reading at arm's length on a laptop; a
                // full-width row on a phone is the primary object on the
                // screen, and 3px of vertical padding on it looks like a
                // caption of itself.
                className={`min-w-0 flex-1 gap-2 px-2.5 py-2 text-[0.875rem] ${
                  props.landed?.day === day &&
                  props.landed.activityId === sticker.activityId
                    ? "animate-land"
                    : ""
                } ${faded(
                  highlight?.activityIds.has(sticker.activityId) ?? false,
                )}`}
              />
              <button
                type="button"
                onClick={() =>
                  props.onCommit({
                    kind: "remove",
                    day,
                    activityId: sticker.activityId,
                  })
                }
                aria-label={`Take ${sticker.name} off ${formatDayLong(day)}`}
                className="grid size-9 shrink-0 place-items-center rounded-full text-ink-muted transition-colors hover:bg-ink/5 hover:text-ink"
              >
                <X className="size-4" strokeWidth={1.5} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>

        {/* Dashed, because it is the shape of a sticker that isn't there yet —
            the same grammar as the two empty states, which are dashed rules
            around a sentence.

            The right-hand gutter matches the × above it, so the dashed row
            lines up with the bars rather than with the row they sit in.

            **It used to unfold a chip list in place, and the sheet replaced
            it.** The inline list could only ever offer what was *not* already
            on the day, because the bars above it were the placed half — which
            made it a picker with a rule no other surface in the app shares.
            The sheet shows the whole library with the placed ones ticked, and
            the week and the month now open the same one. `aria-haspopup` is
            what says the press opens something rather than toggling this
            section, which is what `aria-expanded` used to claim. */}
        <button
          type="button"
          onClick={props.onAddSticker}
          aria-haspopup="dialog"
          className="mt-2 flex min-h-11 w-[calc(100%-2.5rem)] items-center justify-center gap-1.5 rounded-sm border border-dashed border-rule text-[0.83rem] text-ink-muted transition-colors hover:bg-ink/5 hover:text-ink"
        >
          <Plus className="size-4" strokeWidth={1.5} aria-hidden="true" />
          Add a sticker
        </button>
      </section>

      <section>
        <h2 className="eyebrow">Note</h2>
        {/* `DayNote` draws its own hairline above itself. In a week column
            that line separates the note from the sticker stack; here it lands
            just under the label and reads as the top edge of the field, which
            is the one place in this view something needs an edge — a textarea
            with no border and a placeholder is otherwise indistinguishable
            from a caption.

            `key` on the day, so stepping to another date resets the draft.
            `DayNote` reconciles its own state against a changed `note` prop,
            but two days with no note at all are the same prop, and a sentence
            typed and not blurred would follow you to the next day. */}
        <DayNote
          key={day}
          day={day}
          note={stickers.note}
          onCommit={props.onCommit}
        />
      </section>
    </section>
  );
}
