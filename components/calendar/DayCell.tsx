import { useDroppable } from "@dnd-kit/core";
import { Pencil } from "lucide-react";
import { Fragment } from "react";

import { DayMoodButton } from "./DayMoodButton";
import { DraggableMark } from "@/components/dnd/DraggableMark";
import { DropSlot } from "@/components/dnd/DropSlot";
import { Button } from "@/components/ui/button";
import type { CalendarChange } from "@/lib/changes";
import { formatDayLong, type DayCellData, type DayString } from "@/lib/dates";
import type { Highlight } from "@/lib/highlight";
import { wash } from "@/lib/palette";
import type { DayStickers } from "@/lib/stickers";

type Props = {
  cell: DayCellData;
  stickers: DayStickers;
  onOpen: (day: DayString) => void;
  /**
   * The mood popover's way back to the board — the same `commit` the modal and
   * every drop go through, so a mood set from the face and a mood set from the
   * modal are indistinguishable by the time anything acts on them.
   */
  onCommit: (change: CalendarChange) => void;
  /**
   * What's selected in the tray, or null when nothing is. The cell reads it to
   * decide which of *its own marks* are the selected one — a per-sticker
   * question the parent can't answer for it without handing down an array.
   */
  highlight: Highlight | null;
  /**
   * Whether this day is one the selection lands on. The cell never works this
   * out: the grid already has the day's stickers in hand from its one Map
   * lookup, so it asks `dayMatches` there and passes the answer down.
   */
  lit: boolean;
  /**
   * Whether the thing in the air is over this day.
   *
   * Passed down rather than read from `useDroppable`'s own `isOver`, and the
   * reason is the caret. The gaps between marks are droppables too now, so on a
   * pointer drag the thing dnd-kit reports as `over` is a slot *inside* this
   * cell and the cell's own `isOver` is false — the drop highlight would switch
   * off the moment the drop got more precise. The board knows which day either
   * kind of target belongs to, so it answers.
   */
  over: boolean;
  /**
   * Which gap the caret is in, or null when the drag isn't a mark aimed at this
   * day. An index, not an element: the cell renders one slot per gap regardless
   * and lights exactly one of them.
   */
  caretIndex: number | null;
  /**
   * The activity whose mark just arrived on *this* day, or null — which is what
   * it is for 41 of the 42 cells, and for all 42 most of the time. The grid
   * narrows the board's one `landed` value down to a single day before passing
   * it here, so a cell never has to compare dates.
   */
  landed: string | null;
};

/**
 * Two classes for the same slot — `text-ink` and `text-ink-muted` — would
 * collide: Tailwind picks the winner by position in the compiled stylesheet,
 * not by the order you wrote them. So the numeral picks exactly one branch.
 *
 * Today is a ring around the numeral rather than a filled circle. A fill needs
 * the text to invert to stay legible, and inverted text is one token away from
 * unreadable — which is exactly what happened the first time.
 */
function numeralClasses(cell: DayCellData): string {
  if (cell.isToday) return "font-medium text-ink ring-1 ring-ink";
  if (cell.inMonth) return "text-ink";
  return "text-ink-muted/60";
}

/**
 * A day, and the things on it are its own controls now.
 *
 * The cell used to be a single `<button>` carrying one long `aria-label` — "20
 * August. Gym, Meditation. feeling Great" — because that was the only honest way
 * to name a control whose contents were drawings. It isn't a control any more.
 * Every mark is a draggable in its own right, and opening the day is a pencil in
 * the corner, so each thing in here names itself and the concatenated sentence
 * has nothing left to describe.
 *
 * What that sentence carried and nothing else did is the highlight, which is
 * pure colour: an `sr-only` line keeps it, because a feature made entirely of
 * tint doesn't exist for anyone reading the page rather than looking at it.
 * That was the whole lesson of `dayLabel()`, and it outlived the function.
 */
export function DayCell(props: Props) {
  const { cell, stickers, onOpen, onCommit, highlight, lit, caretIndex } = props;

  /**
   * One rule, and it covers every mark on the page: a mark stays at full
   * strength exactly when it is the thing you selected. Everything else recedes
   * — the other stickers on a lit day, every sticker on a day that didn't
   * match, and every mood while an activity is selected.
   *
   * Note what it does *not* touch: the numeral, the today ring, and the grid
   * lines. Fading those would dim the calendar's own skeleton, and for as long
   * as a selection was held the page would stop working as a calendar.
   */
  const selected = (isSelected: boolean) =>
    highlight && !isSelected ? "opacity-35" : "";

  // The drop target is the cell itself, so the hook lives here rather than in a
  // wrapper. A wrapper would need a box for dnd-kit to measure, and a box
  // between the grid and its cell is exactly the thing that breaks the layout.
  //
  // The day string is the id. That's the whole reason `over` is enough to know
  // where a sticker landed — no lookup table, no data payload on this side.
  //
  // `isOver` is deliberately not taken from here; see the `over` prop.
  const { setNodeRef } = useDroppable({ id: cell.day });

  return (
    // A plain `<div>`, and going back to one is the point of the change. A
    // whole-cell button meant the calendar had exactly one gesture — click
    // anywhere, open the modal — and it swallowed the two that a calendar of
    // draggable marks actually wants: picking a mark up, and putting it down
    // somewhere else. Nested controls inside a button aren't allowed either, so
    // as long as the cell was one, the marks in it could only ever be pictures.
    //
    // `group/day` is named rather than bare: the pencil reveals off *this* cell,
    // and the grid renders 42 of them.
    <div
      ref={setNodeRef}
      // The machine-readable date, and the droppable id.
      data-day={cell.day}
      // `isolate` gives the cell its own stacking context, so the negative
      // z-index on the wash below can't escape and paint behind the grid.
      //
      // The hover wash is the same ink-at-low-opacity trick the tray rows use,
      // but not the same number. 5% reads as a light touch across a 28px band
      // and as a grey square across a 150px cell — tint is perceived by area, so
      // the larger the surface the lower the number has to go to mean the same
      // thing. It no longer means "click me"; it means "the pencil is here".
      // A flex column of two things: a header, and everything that happened.
      //
      // The marks briefly wrapped *around* the date and the mood, using floats,
      // which is the only layout mode that can do that — and it's the wrong
      // thing to want here. The top line is a header: this is the 20th, and the
      // day felt like this. A sticker landing between those two turns a label
      // into a shelf, and the two facts stop reading as a pair. The capacity it
      // bought was one mark, and the price was the cell's own structure.
      className={`group/day relative isolate flex min-h-32 w-full flex-col items-stretch justify-start p-2.5 transition-colors ${
        cell.inMonth
          ? "bg-surface hover:bg-ink/2"
          : "bg-surface-sunken hover:bg-ink/2"
      }`}
    >
      {/* The highlight wash, and it sits *behind* the contents — `-z-10`, where
          the drop layer below has no z-index at all and so paints in front.
          That difference is the whole reason they're two elements rather than
          one shared "overlay" helper.

          A negative z-index paints after the cell's own background and before
          its in-flow children, which is exactly what a wash should do: an
          opaque `bg-ramp-red-soft` in front of the marks would hide the very
          stickers it's pointing at, while the drop highlight is a 6% tint that
          genuinely should read on top of them.

          Keeping the base surface underneath is also what makes the ink wash
          work at all. `bg-ink/10` is translucent, so it needs a real surface
          beneath it — laid straight onto the cell it would show the grid's
          hairline colour through the gaps. */}
      {lit && highlight && (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 -z-10 ${wash(highlight.colorKey)}`}
        />
      )}

      {/* The tint said out loud. The only part of the old `dayLabel` sentence
          with no element of its own to live in. */}
      {lit && highlight && (
        <span className="sr-only">
          {formatDayLong(cell.day)} is highlighted for {highlight.label}.
        </span>
      )}

      {/* The highlight is its own layer rather than a swapped background class,
          because it has to sit *over* the cell's own colour — a cell borrowed
          from next month is sunken, and it should still read as targeted.

          Ink at low opacity, which is one declaration that lands correctly in
          both themes: dark ink darkens the cream, light ink lightens the
          charcoal. A fixed grey would have needed two values, and the same
          trick already runs the scrollbars. */}
      {props.over && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 border-2 border-ink/40 bg-ink/6"
        />
      )}

      {/* The day's own line: number left, mood right, nothing between them.
          Two facts about the day as a whole, and the gap between them is what
          makes them read as a header rather than as the first two items of a
          list.

          The mood is still not a draggable. It has nowhere to be moved *to* —
          `unique (user_id, day)` means a day holds one, so "carrying it to
          Thursday" would be a replace wearing a move's gesture. What it is
          instead is a button: a mood is the one thing on a day you *revise*,
          and the pencil is a heavy way to change one field. */}
      <div className="flex items-center justify-between gap-2">
        <time
          dateTime={cell.day}
          className={`oldstyle grid size-7 place-items-center rounded-full text-[0.95rem] ${numeralClasses(cell)}`}
        >
          {cell.dayOfMonth}
        </time>

        {stickers.mood && (
          <DayMoodButton
            day={cell.day}
            mood={stickers.mood}
            faded={selected(highlight?.mood === stickers.mood)}
            onCommit={onCommit}
          />
        )}
      </div>

      {/* Wraps rather than scrolls or truncates: a day with eight stickers is a
          good day, and hiding some of them would be lying about it. The cell's
          min-height is a floor, so a busy day simply makes its row taller.

          `mt-2` is the breathing room, and it's what makes the line above read
          as a header. Without it the date, the mood and the marks are one
          undifferentiated pile.

          Inline flow rather than `flex-wrap`, which matters for one reason: the
          pencil at the end has to sit in the same run as the marks, and it is a
          different height. In a flex row that's a stretch/align problem; in a
          line of inline-blocks it's just the next box.

          `mr-0.5` and not `mr-1`, and this is arithmetic against an 85px cell —
          744px of calendar over seven columns, less `p-2.5` either side. Three
          26px marks with 4px between them come to 86px, one pixel over, so the
          row broke at two and the right-hand column of every cell stayed empty.
          Two-pixel gaps make it 82.

          `leading-[30px]` is what separates the rows, because a vertical margin
          on an inline-level box does nothing to the line box around it — the
          gap between wrapped rows has to come from line-height. 26px of mark
          plus 4px of air, matching the horizontal rhythm.

          The marks are interleaved with `DropSlot`s — one before each mark and
          one after the last — which is what makes a drop land *somewhere* in
          the day rather than merely *on* it. They take no width, so none of the
          arithmetic above changes; see `DropSlot` for why that's the whole
          trick. */}
      <div className="mt-2 leading-[30px] [&>button]:mr-0.5 [&>button]:align-top">
        {stickers.activities.map((sticker, index) => (
          // Keyed by activity, not by the sticker's row id, and the difference
          // is visible. A placed sticker renders first under an optimistic
          // `pending:…` id and then again under the uuid the server hands back
          // — same mark, two identities, a fraction of a second apart. Keyed by
          // id that's an unmount and a remount, which restarts the landing
          // animation from the top halfway through itself. The activity is
          // unique within a day, so it's just as good a key and it doesn't
          // change underneath the element.
          <Fragment key={sticker.activityId}>
            <DropSlot
              day={cell.day}
              index={index}
              active={caretIndex === index}
            />
            <DraggableMark
              sticker={sticker}
              day={cell.day}
              faded={selected(
                highlight?.activityIds.has(sticker.activityId) ?? false,
              )}
              landing={props.landed === sticker.activityId}
            />
          </Fragment>
        ))}

        {/* The last gap, and the only one that exists on an empty day — which
            is why it's here rather than folded into the loop as an off-by-one.
            A day with nothing on it still has one place to put something. */}
        <DropSlot
          day={cell.day}
          index={stickers.activities.length}
          active={caretIndex === stickers.activities.length}
        />

        {/* The way in to the modal, and now the only one.

            It takes a mark's slot at the end of the run rather than floating
            over the corner. That's the whole fix for a problem the corner
            version had: absolutely positioned, it sat on top of whatever mark
            reached the bottom right, and a mark you can't see is a mark you
            can't pick up. Reserving a slot costs one sticker's worth of room on
            a busy day and costs nothing at all on a quiet one, which is most of
            them.

            Hidden until the cell is hovered, so 42 pencils don't compete with
            the marks on a page that is mostly read rather than edited. `opacity-0`
            and not `hidden`, because the slot has to stay held either way — a
            control that appears and reflows the row it's in is worse than one
            that was always visible.

            The hiding is behind `@media (hover: hover)`, which is the rule this
            project has had to learn twice: a touch device never fires hover, so
            an `opacity-0` that only lifts on `:hover` is a tap target you can't
            see and can still hit. On a phone every pencil is simply visible. */}
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={() => onOpen(cell.day)}
          aria-label={`Edit ${formatDayLong(cell.day)}`}
          title="Edit this day"
          className={`opacity-100
            [@media(hover:hover)]:opacity-0
            [@media(hover:hover)]:group-hover/day:opacity-100
            [@media(hover:hover)]:focus-visible:opacity-100`}
        >
          <Pencil strokeWidth={1.5} />
        </Button>
      </div>
    </div>
  );
}
