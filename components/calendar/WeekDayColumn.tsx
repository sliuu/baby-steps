import { useDroppable } from "@dnd-kit/core";
import { Pencil } from "lucide-react";
import { Fragment } from "react";

import { DayMoodButton } from "./DayMoodButton";
import { DayNote } from "./DayNote";
import { DraggableMark } from "@/components/dnd/DraggableMark";
import { DropSlot } from "@/components/dnd/DropSlot";
import { Button } from "@/components/ui/button";
import type { CalendarChange } from "@/lib/changes";
import { formatDayLong, type DayString, type WeekDayData } from "@/lib/dates";
import type { Highlight } from "@/lib/highlight";
import { wash } from "@/lib/palette";
import type { DayStickers } from "@/lib/stickers";

/**
 * How much room a day keeps for stickers whether or not it has any.
 *
 * A week of empty columns should look like seven places to drop something, not
 * seven headers with a note under each. Everything added below this floor makes
 * the panel taller instead of eating into it, which is the whole reason the
 * minimum lives on the stack rather than on the column around it.
 *
 * 22.25rem is the rest of the vertical budget. A 14" laptop gives the page
 * about 850px; 64 of nav, 80 of `main`'s padding, 48 of title, 24 of gap and
 * roughly 140 of column chrome, pencil row and note leave a little over 500,
 * and 356 of stack sits inside that with about three lines of note growth to
 * spare before the window has to scroll. Raise it and a two-line note starts a
 * scrollbar; lower it and an empty week floats in the top two thirds of the
 * screen.
 *
 * It was 24rem until the pencil moved out of the header and into a 28px row of
 * its own above the note. That row is height the column did not have before, so
 * the floor gave back exactly as much as it took and the resting picture is
 * unchanged. Anything else added between the stack and the note comes out of
 * here the same way.
 */
const STACK_FLOOR = "min-h-[22.25rem]";

type Props = {
  day: WeekDayData;
  stickers: DayStickers;
  onOpen: (day: DayString) => void;
  /** Moods, notes, and anything else this column can change. */
  onCommit: (change: CalendarChange) => void;
  /** The resolved tray selection, or null. */
  highlight: Highlight | null;
  /** True when this column holds something the highlight selected. */
  lit: boolean;
  /** True when a drag is currently over this column. */
  over: boolean;
  /** Where the caret sits in this column's stack, or null. */
  caretIndex: number | null;
  /** The activity that just landed here, or null. */
  landed: string | null;
};

/**
 * One day of the week strip: a header, a stack of named stickers, and a note.
 *
 * `DayCell`'s taller sibling, and not a variant of it. A month cell is a
 * hundred pixels of square that has to hold five circles, a numeral and a
 * face; this is a column that holds a list and a paragraph. The two share
 * their behaviour — the same droppable id, the same slots, the same pencil,
 * the same wash — and share it by using the same three components, not by
 * being one component with a `tall` prop.
 *
 * There is no `inMonth` here. A week borrows no days from its neighbours, so
 * every column is a real day and none of them are dimmed. The one place that
 * shows is the last week of a month, where four columns say August and three
 * say September; the numerals alone carry that, and the title above says which
 * two months they are.
 */
export function WeekDayColumn(props: Props) {
  const { day, stickers, onCommit, highlight, lit, caretIndex } = props;

  // The tray's highlight fades everything it didn't select, exactly as in a
  // month cell — one rule, so the two views dim the same things.
  const selected = (isSelected: boolean) =>
    highlight && !isSelected ? "opacity-35" : "";

  const { setNodeRef } = useDroppable({ id: day.day });

  return (
    <div
      ref={setNodeRef}
      data-day={day.day}
      // No height and no minimum of its own — deliberately. The column is
      // exactly as tall as its three parts, so anything that grows inside it
      // grows *it*. Grid rows stretch, so the tallest day of the week sets the
      // height of all seven and they stay level. The generous empty look comes
      // from `STACK_FLOOR` below instead.
      className="group/day relative isolate flex w-full flex-col bg-surface p-2.5 transition-colors hover:bg-ink/2"
    >
      {/* The highlight's colour, behind everything. Same wash as a month cell. */}
      {lit && highlight && (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 -z-10 ${wash(highlight.colorKey)}`}
        />
      )}

      {lit && highlight && (
        <span className="sr-only">
          {formatDayLong(day.day)} is highlighted for {highlight.label}.
        </span>
      )}

      {/* The drop outline. Inside the column rather than on it, so it doesn't
          have to fight the 1px grid gap for the same pixel. */}
      {props.over && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 border-2 border-ink/40 bg-ink/6"
        />
      )}

      {/* Weekday and numeral together, because a column this wide reads as its
          own list and can't lean on a header row seven columns long. The mood
          sits at the other end and is now the only thing there.

          The pencil used to be beside it, which is where the month cell keeps
          it, and four things on one line — weekday, numeral, face, pencil — is
          more than a 100px header can carry legibly. The month cell gets away
          with three because one of them is the pencil sharing a run with the
          marks rather than the date. Down here there is a better place for it:
          see the row above the note. */}
      <div className="flex items-center justify-between gap-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="daylabel">{day.weekday}</span>
          <time
            dateTime={day.day}
            className={`oldstyle grid size-7 place-items-center rounded-full text-[0.875rem] ${
              day.isToday ? "font-medium text-ink ring-1 ring-ink" : "text-ink"
            }`}
          >
            {day.dayOfMonth}
          </time>
        </div>

        {stickers.mood && (
          <DayMoodButton
            day={day.day}
            mood={stickers.mood}
            faded={selected(highlight?.mood === stickers.mood)}
            onCommit={onCommit}
          />
        )}
      </div>

      {/* The stack, and the one thing in the column with a minimum height.

          That minimum is the whole reason the panel grows the way it does. It
          was on the column before, which reads the same when nothing has
          happened and is wrong the moment a note gets longer: a column pinned
          at 26rem with four stickers in it is twenty rem of dead air, and a
          note growing a line just eats a line of that air. The column stays
          26rem, the bars appear to slide up, and nothing else on the page
          moves. Put the floor here and the arithmetic changes — the column is
          the sum of its parts, so a line added to the note is a line added to
          the column, every time, from the first one.

          It does not `grow`, and that is the point. A growing stack pins the
          note to the bottom of the column, so a note gaining a line takes that
          line off its own top and expands *upwards* into the sticker area —
          the hairline above it climbs, the column's bottom edge never moves,
          and nothing else on the page notices. Fixed instead, the hairline
          stays put in all seven days, the note grows downwards, and the column
          has to get taller to hold it. `shrink-0` so it is never the thing
          that gives.

          What this trades away is the bottom edge. A short note no longer sits
          on the floor of its column; it sits under its own hairline with the
          spare height below it, because the seven are stretched to the tallest
          of them. Tops aligned rather than bottoms, which is the right way
          round when the thing being aligned is the first line of a sentence.

          `gap-0.5` between bars; the slots are zero-height and sit in the gaps,
          so the caret lands in the space that already exists rather than
          opening a new one. */}
      <div className={`mt-2 flex shrink-0 flex-col gap-0.5 ${STACK_FLOOR}`}>
        {stickers.activities.map((sticker, index) => (
          <Fragment key={sticker.activityId}>
            <DropSlot
              day={day.day}
              index={index}
              axis="block"
              active={caretIndex === index}
            />
            <DraggableMark
              sticker={sticker}
              day={day.day}
              shape="bar"
              faded={selected(
                highlight?.activityIds.has(sticker.activityId) ?? false,
              )}
              landing={props.landed === sticker.activityId}
            />
          </Fragment>
        ))}

        {/* The end of the stack, and the target for everything dropped into the
            empty space below it — the nearest-slot search in `CalendarBoard`
            has nothing else to find down there. */}
        <DropSlot
          day={day.day}
          index={stickers.activities.length}
          axis="block"
          active={caretIndex === stickers.activities.length}
        />
      </div>

      {/* The way in to the modal, moved down out of the header.

          It sits below the stack and above the note's hairline, which is the
          one horizontal band in the column with nothing else in it — the stack
          ends at a fixed floor and the note starts at its rule, so this is
          genuinely spare room rather than room taken from something. Right-
          aligned, because that is the edge it was on before and the note's own
          text starts at the left.

          `shrink-0` for the same reason the stack has it: this row is 24px and
          is never the thing that gives when the column is short.

          Still `opacity-0` until the column is hovered, still only behind
          `@media (hover: hover)`, and still holding its slot either way — a
          control that appears and reflows what is under it is worse than one
          that was always visible, and on a touch device it simply is. */}
      <div className="mt-1 flex shrink-0 justify-end">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={() => props.onOpen(day.day)}
          aria-label={`Edit ${formatDayLong(day.day)}`}
          title="Edit this day"
          className={`opacity-100
            [@media(hover:hover)]:opacity-0
            [@media(hover:hover)]:group-hover/day:opacity-100
            [@media(hover:hover)]:focus-visible:opacity-100`}
        >
          <Pencil strokeWidth={1.5} />
        </Button>
      </div>

      <DayNote day={day.day} note={stickers.note} onCommit={onCommit} />
    </div>
  );
}
