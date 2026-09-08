"use client";

import { useDraggable } from "@dnd-kit/core";

import { StickerMark } from "@/components/calendar/StickerMark";
import { formatDayLong, type DayString } from "@/lib/dates";
import { faceOf, type ActivitySticker } from "@/lib/stickers";

type Props = {
  sticker: ActivitySticker;
  /** Where it currently is. Travels in the payload; a drop reads it as "move". */
  day: DayString;
  /** The fade a highlight puts on every mark it didn't select. */
  faded: string;
  /**
   * True for about half a second after this mark is placed or moved here.
   *
   * The board decides, not this component: a mark has no way to tell "I have
   * just arrived" from "I have been here since March", because both look
   * exactly the same from inside a render.
   */
  landing: boolean;
};

/**
 * A mark already on a day, picked up.
 *
 * The counterpart to `DraggableSticker`, and separate from it on purpose: that
 * one is a whole tray row — inset, full width, a name beside the circle, a hover
 * band — and this is a 26px circle inside a grid cell. Sharing them would mean a
 * `variant` prop switching off most of one of them, which is the argument
 * `ArchivedRow` already settled. What they genuinely share is `StickerMark`,
 * which is the drawing, and `DragPayload`, which is the contract.
 *
 * The id is the *placement* row, not the activity. Two days holding Gym are two
 * draggables and they must not collide in one `DndContext` — `activityId` would
 * be the same string twice, and dnd-kit would treat the second as a duplicate
 * registration. The payload carries both ids for the same reason it always has:
 * the drop writes `activity_id`, the drag identifies a row.
 *
 * It's a `<button>` because `useDraggable` hands back keyboard listeners and a
 * `tabIndex`, and neither does anything on an element that can't take focus.
 * That does add one tab stop per mark on the calendar, which is the honest cost
 * of the marks being things you can pick up rather than pictures.
 *
 * Clicking one does nothing at all, and that is deliberate rather than
 * unfinished: the body is a drag handle, exactly like a mood row in the tray.
 * Opening the day belongs to the pencil in the corner, which is the whole point
 * of the change — a mark you can grab shouldn't also be a button that opens
 * something, or you can't tell by looking which of the two a press will do.
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
      // `StickerMark` names itself "Gym" for the sake of the grid, where a
      // circle sits alone with no text beside it. On a control that name isn't
      // enough on its own: tabbing lands here from anywhere, and forty marks all
      // announcing "Gym, draggable" with no anchor is a list with no addresses.
      // The day is what makes each one identifiable.
      aria-label={`${props.sticker.name}, ${formatDayLong(props.day)}`}
      // `touch-none` for the same reason the tray rows carry it: without
      // `touch-action: none` the browser claims the gesture for scrolling before
      // dnd-kit has seen enough of it, and a mark won't lift on a phone.
      //
      // `rounded-full` matches the circle inside, so the focus ring traces the
      // sticker rather than boxing it.
      // `animate-land` is a scale-up-and-settle defined in globals.css. It runs
      // on this button rather than on the circle inside it so the focus ring
      // travels with the mark, and it's a transform, so nothing in the line box
      // around it moves while the mark grows past its final size and back.
      //
      // This is the piece that replaces dnd-kit's drop animation, which is
      // switched off at the `DragOverlay`. That one animates the *overlay* back
      // to wherever the drag started — the tray, for most placements — so the
      // sticker's last movement was away from the day it had just been put on.
      // Animating the result instead means the same motion plays whether the
      // mark arrived by drag or by a checkbox in the day modal.
      className={`touch-none rounded-full transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
        props.landing ? "animate-land" : ""
      } ${
        isDragging ? "opacity-35" : `cursor-grab active:cursor-grabbing ${props.faded}`
      }`}
    >
      <StickerMark sticker={props.sticker} />
    </button>
  );
}
