"use client";

import { useDroppable } from "@dnd-kit/core";
import { Minus, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";

import { DayNote } from "./DayNote";
import { MoodMark } from "./MoodMark";
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
import { MOOD_LABEL, MOODS } from "@/lib/moods";
import type { LibraryGroup } from "@/lib/queries/activities";
import { PAGE_TITLE } from "@/lib/layout";
import { ramp, wash } from "@/lib/palette";
import { NO_STICKERS } from "@/lib/stickers";

type Props = PeriodProps & {
  /** The day on show. `CalendarPanel` owns it; this reports taps back. */
  anchor: Date;
  onPickDay: (day: Date) => void;
  /** Everything you could put on the day. See `CalendarPanel`. */
  groups: LibraryGroup[];
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
 * **So adding one is a selection too.** The tray is a drag source, and a drag
 * is the gesture this screen can't take; the modal behind the old add row was
 * a whole dialog for one tick. What is here instead is the same shape the mood
 * row already uses — the things you could choose, laid out, tap one and it is
 * on the day — except that a sticker library is fifteen entries where a mood is
 * five, so it stays folded until you ask for it. Closed, the section is the day
 * you had. Open, it is the day you could have.
 *
 * Only what is *not* already on the day appears in it, which is what keeps the
 * two halves from being the same list twice: a placed sticker is a full-width
 * bar with an × and an unplaced one is a chip you can press, and nothing is
 * ever both.
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

  /**
   * The library minus what is already here, flattened.
   *
   * Archived stickers are left out, and a placed one is left out whether it is
   * archived or not — the picker only ever adds, so the rule the modal needs
   * ("show a retired sticker if it is on this day, or it can never come off")
   * doesn't apply: the bar above with its × is that control.
   */
  const placed = new Set(
    stickers.activities.map((sticker) => sticker.activityId),
  );
  const available = props.groups.flatMap((group) =>
    group.stickers.filter(
      (sticker) => !sticker.archived && !placed.has(sticker.id),
    ),
  );

  const { setNodeRef } = useDroppable({ id: day });

  // Folded by default, and it stays open across taps — adding three things is
  // one trip to the picker rather than three. It also survives stepping to
  // another day, because this component stays mounted and only `anchor`
  // changes: the day you are filling in moves, the drawer you opened to fill
  // it in doesn't. Which is what you want when catching up on a week.
  const [picking, setPicking] = useState(false);

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
    <section className="flex flex-col gap-9">
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

        <p className="mt-2 text-center text-[0.78rem] text-ink-muted">
          Tap another day to look back.
        </p>
      </div>

      <section>
        <h2 className="eyebrow">How it felt</h2>

        {/* Five columns, always — the same shape as the tray's picker, and for
            the same reason: wrapping four and one puts a lone face on its own
            line, which reads as a different kind of thing.

            Pressing the mood already on the day clears it. A phone has no
            hover and no second control to spare, and "none" has to stay
            reachable or one mis-tap is permanent — the modal's radio group
            solves that with a sixth option and the popover with a separate
            line, and neither shape fits five faces across a phone. `aria-
            pressed` is what says this is a toggle rather than a radio. */}
        <div className="mt-3 grid grid-cols-5 gap-1">
          {MOODS.map((mood) => {
            const chosen = mood === stickers.mood;
            return (
              <button
                key={mood}
                type="button"
                aria-pressed={chosen}
                onClick={() =>
                  props.onCommit(
                    chosen
                      ? { kind: "clearMood", day }
                      : { kind: "mood", day, mood },
                  )
                }
                className={`flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-lg transition-colors ${
                  chosen ? "bg-secondary" : "hover:bg-ink/5"
                } ${faded(highlight?.mood === mood)}`}
              >
                {/* `MoodMark` carries its own "Mood: Great" for screen
                    readers, so the visible word underneath is hidden from them
                    to stop the button reading the label twice. */}
                <MoodMark mood={mood} />
                <span
                  aria-hidden="true"
                  className={`text-[0.69rem] leading-none ${
                    chosen ? "text-ink" : "text-ink-muted"
                  }`}
                >
                  {MOOD_LABEL[mood]}
                </span>
              </button>
            );
          })}
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
            lines up with the bars rather than with the row they sit in. */}
        <button
          type="button"
          onClick={() => setPicking((open) => !open)}
          aria-expanded={picking}
          className="mt-2 flex min-h-11 w-[calc(100%-2.5rem)] items-center justify-center gap-1.5 rounded-sm border border-dashed border-rule text-[0.83rem] text-ink-muted transition-colors hover:bg-ink/5 hover:text-ink"
        >
          {picking ? (
            <Minus className="size-4" strokeWidth={1.5} aria-hidden="true" />
          ) : (
            <Plus className="size-4" strokeWidth={1.5} aria-hidden="true" />
          )}
          {picking ? "Done adding" : "Add a sticker"}
        </button>

        {picking &&
          (available.length > 0 ? (
            /* A wrapping row of chips rather than the library's six labelled
               groups. The headings are what make the modal's list long, and
               the colour already says which area a sticker belongs to — six
               eyebrows over one or two chips each would be more heading than
               list. Library order is kept, so the areas still arrive in their
               own order and a chip doesn't move between visits. */
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {available.map((sticker) => (
                <li key={sticker.id}>
                  <button
                    type="button"
                    // Same 44px floor as everything else you tap here, bought
                    // as transparent padding around a 36px bar rather than by
                    // inflating the bar: a chip and a placed sticker have to
                    // be the same object at the same size, or pressing one
                    // looks like it made a different thing.
                    onClick={() =>
                      props.onCommit({
                        kind: "place",
                        day,
                        activityId: sticker.id,
                        face: sticker,
                        // The end of the day, the same index the modal's
                        // checkbox names and the same one a drop with no slot
                        // under it lands at. This view offers no ordering, so
                        // all three of its doors agree about that.
                        index: stickers.activities.length,
                      })
                    }
                    aria-label={`Put ${sticker.name} on ${formatDayLong(day)}`}
                    className="flex min-h-11 items-center rounded-sm transition-opacity active:opacity-60"
                  >
                    <StickerBar
                      sticker={sticker}
                      className="w-auto gap-2 px-2.5 py-2 text-[0.875rem]"
                    />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-[0.83rem] text-ink-muted">
              {props.groups.some((group) =>
                group.stickers.some((sticker) => !sticker.archived),
              )
                ? "Everything you have is already on this day."
                : "No stickers yet. Make one in the tray."}
            </p>
          ))}
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
