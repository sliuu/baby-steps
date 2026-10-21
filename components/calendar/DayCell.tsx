import { useDroppable } from "@dnd-kit/core";
import { Fragment } from "react";

import { DraggableMark } from "@/components/dnd/DraggableMark";
import { DropSlot } from "@/components/dnd/DropSlot";
import { MoodDot } from "@/components/ui/Mood";
import { formatDayLong, type DayString } from "@/lib/dates";
import type { Highlight } from "@/lib/highlight";
import { MOOD_LABEL } from "@/lib/moods";
import { wash } from "@/lib/palette";
import type { DayStickers } from "@/lib/stickers";
import { cn } from "@/lib/utils";

type Props = {
  day: DayString;
  dayOfMonth: number;
  /** False for days borrowed from the months either side. */
  inMonth?: boolean;
  isToday: boolean;
  /** After today: faded, can't be selected or dropped on. */
  future: boolean;
  /** The day the side panel shows. */
  selected: boolean;
  onSelect: (day: DayString) => void;
  stickers: DayStickers;
  highlight: Highlight | null;
  /** This day matches the highlight. */
  lit: boolean;
  /** A drag is over this day. */
  over: boolean;
  /** Which gap the caret is in, or null. */
  caretIndex: number | null;
  /** Activity that just landed here, or null. */
  landed: string | null;
  /** Height floor; the week passes a taller one. */
  className?: string;
};

/** One day in the month or week grid: date, mood dot, every sticker at xs. */
export function DayCell(props: Props) {
  const { day, stickers, highlight, caretIndex } = props;
  const { setNodeRef } = useDroppable({ id: day, disabled: props.future });

  // Everything but the selected thing fades while something is lit.
  const faded = (isSelected: boolean) => (highlight && !isSelected ? "opacity-35" : "");
  const label = formatDayLong(day);

  return (
    <div
      ref={setNodeRef}
      data-day={day}
      // Whole cell selects for pointers; the date button is the keyboard way in.
      onClick={props.future ? undefined : () => props.onSelect(day)}
      className={cn(
        "relative isolate flex min-h-24 w-full flex-col bg-paper p-s1",
        // Fade the contents, not the paper: the grid lines sit behind it.
        props.future ? "[&>*]:opacity-45" : "cursor-pointer",
      )}
    >
      {props.lit && highlight && (
        <>
          <div
            aria-hidden="true"
            className={cn("pointer-events-none absolute inset-0 -z-10", wash(highlight.colorKey))}
          />
          <span className="sr-only">
            {label} is highlighted for {highlight.label}.
          </span>
        </>
      )}

      {props.selected && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 inset-ring-2 inset-ring-ink"
        />
      )}

      {props.over && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 border-2 border-ink/40 bg-ink/6"
        />
      )}

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={props.future}
          aria-pressed={props.selected}
          aria-label={label}
          onClick={(event) => {
            event.stopPropagation();
            props.onSelect(day);
          }}
          className={cn(
            "grid size-5.5 place-items-center rounded-full text-caption tabular-nums",
            props.isToday
              ? "bg-ink text-paper"
              : props.inMonth === false
                ? // Muted, not subtle: still a real, openable day, so it needs 4.5:1.
                  "text-ink-muted"
                : "text-ink",
          )}
        >
          <time dateTime={day}>{props.dayOfMonth}</time>
        </button>

        {stickers.mood && (
          <span className={faded(highlight?.mood === stickers.mood)}>
            <MoodDot mood={stickers.mood} />
            <span className="sr-only">{MOOD_LABEL[stickers.mood].toLowerCase()}</span>
          </span>
        )}
      </div>

      {/* Wraps; margins not gap, since slots are items too. */}
      <div
        className={cn("mt-1.5 flex flex-wrap content-start gap-y-1 [&>button]:mr-1", props.className)}
      >
        {stickers.activities.map((sticker, index) => (
          // Keyed by activity: the row id changes when the optimistic insert lands.
          <Fragment key={sticker.activityId}>
            {!props.future && <DropSlot day={day} index={index} active={caretIndex === index} />}
            <DraggableMark
              sticker={sticker}
              day={day}
              faded={faded(highlight?.activityIds.has(sticker.activityId) ?? false)}
              landing={props.landed === sticker.activityId}
            />
          </Fragment>
        ))}
        {!props.future && (
          <DropSlot
            day={day}
            index={stickers.activities.length}
            active={caretIndex === stickers.activities.length}
          />
        )}
      </div>
    </div>
  );
}
