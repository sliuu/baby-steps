import { useDroppable } from "@dnd-kit/core";

import { MoodMark } from "./MoodMark";
import { StickerMark } from "./StickerMark";
import { formatDayLong, type DayCellData, type DayString } from "@/lib/dates";
import { MOOD_LABEL } from "@/lib/moods";
import type { DayStickers } from "@/lib/stickers";

type Props = {
  cell: DayCellData;
  stickers: DayStickers;
  onOpen: (day: DayString) => void;
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
 * One sentence naming the whole cell, because the cell is now one control.
 *
 * Everything inside it — the numeral, each sticker, the mood — already carries
 * its own accessible name, which was right when the cell was a plain container.
 * As a button those names would be concatenated into its label, and "20 Gym
 * Meditation Great" is not a sentence. `aria-label` takes precedence over
 * contents, so this replaces all of it with something a person would say.
 */
function dayLabel(cell: DayCellData, stickers: DayStickers): string {
  const parts = [formatDayLong(cell.day)];

  if (stickers.activities.length > 0) {
    parts.push(stickers.activities.map((sticker) => sticker.name).join(", "));
  }
  if (stickers.mood) {
    parts.push(`feeling ${MOOD_LABEL[stickers.mood]}`);
  }
  if (parts.length === 1) parts.push("empty");

  return parts.join(". ");
}

export function DayCell(props: Props) {
  const { cell, stickers, onOpen } = props;

  // The drop target is the cell itself, so the hook lives here rather than in a
  // wrapper. A wrapper would need a box for dnd-kit to measure, and a box
  // between the grid and its cell is exactly the thing that breaks the layout.
  //
  // The day string is the id. That's the whole reason `over` is enough to know
  // where a sticker landed — no lookup table, no data payload on this side.
  const { setNodeRef, isOver } = useDroppable({ id: cell.day });

  return (
    // A real button, not a div with an onClick. It has to be reachable by tab,
    // fire on Enter and Space, and announce itself as something that does
    // something — all of which a button is, for free and correctly, and none of
    // which a div gets without reimplementing them by hand.
    //
    // Nothing inside is interactive, so there are no nested controls: the
    // stickers are drawings, and editing them is what the modal is for.
    <button
      ref={setNodeRef}
      type="button"
      // The machine-readable date, the droppable id, and now also the argument.
      data-day={cell.day}
      onClick={() => onOpen(cell.day)}
      aria-label={dayLabel(cell, stickers)}
      // `flex flex-col justify-start` is not a layout choice, it's a correction.
      // A button centres its own contents vertically — that behaviour is built
      // into how the browser lays a button out, and `display: block` does not
      // turn it off. With `min-h-32` making every cell taller than its contents,
      // the date and stickers floated to the middle the moment this stopped
      // being a div. Declaring a real layout replaces the built-in one.
      // `items-stretch` keeps the date row full width so its mood stays pinned
      // right.
      //
      // The focus ring is an outline pulled inward rather than a ring. The grid
      // clips its children (`overflow-hidden` is what makes the 1px hairlines),
      // so a ring drawn outside the cell's box would be shaved off along every
      // shared edge.
      //
      // The hover wash is the same ink-at-low-opacity trick the tray rows use,
      // but not the same number. 5% reads as a light touch across a 28px band
      // and as a grey square across a 150px cell — tint is perceived by area, so
      // the larger the surface the lower the number has to go to mean the same
      // thing.
      className={`relative flex min-h-32 w-full cursor-pointer flex-col items-stretch justify-start p-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink ${
        cell.inMonth
          ? "bg-surface hover:bg-ink/2"
          : "bg-surface-sunken hover:bg-ink/2"
      }`}
    >
      {/* The highlight is its own layer rather than a swapped background class,
          because it has to sit *over* the cell's own colour — a cell borrowed
          from next month is sunken, and it should still read as targeted.

          Ink at low opacity, which is one declaration that lands correctly in
          both themes: dark ink darkens the cream, light ink lightens the
          charcoal. A fixed grey would have needed two values, and the same
          trick already runs the scrollbars. */}
      {isOver && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 border-2 border-ink/40 bg-ink/6"
        />
      )}

      {/* The day's own line: number left, mood right. The mood is a summary of
          the whole day, so it sits with the date rather than in the row of
          things that happened. */}
      <div className="flex items-center justify-between gap-2">
        <time
          dateTime={cell.day}
          className={`oldstyle grid size-7 place-items-center rounded-full text-[0.95rem] ${numeralClasses(cell)}`}
        >
          {cell.dayOfMonth}
        </time>

        {stickers.mood && <MoodMark mood={stickers.mood} />}
      </div>

      {/* Wraps rather than scrolls or truncates: a day with eight stickers is a
          good day, and hiding some of them would be lying about it. The cell's
          min-height is a floor, so a busy day simply makes its row taller. */}
      {stickers.activities.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {stickers.activities.map((sticker) => (
            <StickerMark key={sticker.id} sticker={sticker} />
          ))}
        </div>
      )}
    </button>
  );
}
