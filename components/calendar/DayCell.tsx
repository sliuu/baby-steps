import { MoodMark } from "./MoodMark";
import { StickerMark } from "./StickerMark";
import type { DayCellData } from "@/lib/dates";
import type { DayStickers } from "@/lib/queries/stickers";

type Props = {
  cell: DayCellData;
  stickers: DayStickers;
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

export function DayCell(props: Props) {
  const { cell, stickers } = props;

  return (
    <div
      // The machine-readable date sits on the element even though nothing reads
      // it yet. Step 8 drops stickers onto these, and it will want a key.
      data-day={cell.day}
      className={`min-h-32 p-2.5 ${
        cell.inMonth ? "bg-surface" : "bg-surface-sunken"
      }`}
    >
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
    </div>
  );
}
