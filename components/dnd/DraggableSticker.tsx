"use client";

import { useDraggable } from "@dnd-kit/core";
import type { ReactNode } from "react";

import { TRAY_INSET } from "@/lib/layout";
import type { DragPayload } from "./payload";

type Props = {
  /** Unique across the whole DndContext. Activity uuids and mood names both are. */
  id: string;
  payload: DragPayload;
  children: ReactNode;
};

/**
 * Makes one tray row liftable.
 *
 * A real `<button>`, not a div with a mouse listener. `useDraggable` hands back
 * `attributes` containing `tabIndex` and `aria-roledescription`, plus
 * `listeners` for pointer *and* keyboard — so the element has to be something
 * that can hold focus for any of that to work. A button is that for free, and
 * it stays a button in Step 9 when clicking one means something.
 *
 * `touch-none` is not decoration. Without `touch-action: none` the browser
 * claims the gesture for scrolling before dnd-kit sees enough of it to know a
 * drag started, and the tray simply won't drag on a phone.
 *
 * The row goes faint rather than disappearing while it's in the air. The copy
 * following the cursor is a `DragOverlay`, a separate element — the original
 * never leaves the tray, so nothing below it reflows and the list doesn't
 * shuffle under your hand mid-drag.
 */
export function DraggableSticker(props: Props) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: props.id,
    data: props.payload,
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...listeners}
      {...attributes}
      // TRAY_INSET rather than a local px-2, and no negative margin to cancel
      // it. The padding is what keeps the highlight off the circle; the group
      // label above and the tray header carry the same value, so nothing ends
      // up indented relative to anything else and nothing reaches the rail's
      // edge. See lib/layout.ts for why it's shared rather than written here.
      className={`${TRAY_INSET} flex min-w-0 flex-1 touch-none items-center gap-2.5 rounded-md py-1 text-left transition-opacity ${
        isDragging
          ? "opacity-35"
          : "cursor-grab hover:bg-ink/5 active:cursor-grabbing"
      }`}
    >
      {props.children}
    </button>
  );
}
