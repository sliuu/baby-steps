"use client";

import { useDraggable } from "@dnd-kit/core";

import { StickerMark } from "@/components/calendar/StickerMark";
import { formatDayLong, type DayString } from "@/lib/dates";
import { faceOf, type ActivitySticker } from "@/lib/stickers";
import { cn } from "@/lib/utils";

type Props = {
  sticker: ActivitySticker;
  /** Where it is now; a drop reads it as "move". */
  day: DayString;
  /** The highlight's fade, or "". */
  faded: string;
  /** Just placed here: plays the land. */
  landing: boolean;
};

/**
 * A sticker already on a day, at xs. Drag to move, off the grid to remove.
 * Keyed by the placement row so two days holding Gym don't collide.
 */
export function DraggableMark(props: Props) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: props.sticker.id,
    data: {
      kind: "activity",
      activityId: props.sticker.activityId,
      face: faceOf(props.sticker),
      from: props.day,
    },
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...listeners}
      {...attributes}
      aria-label={`${props.sticker.name}, ${formatDayLong(props.day)}`}
      className={cn(
        "touch-none rounded-full transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
        props.landing && "animate-land",
        isDragging ? "opacity-35" : cn("cursor-grab active:cursor-grabbing", props.faded),
      )}
    >
      <StickerMark sticker={props.sticker} size="xs" />
    </button>
  );
}
