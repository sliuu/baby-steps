"use client";

import { useDraggable } from "@dnd-kit/core";
import type { ReactNode } from "react";

import { TRAY_INSET } from "@/lib/layout";
import type { DragPayload } from "./payload";

type Props = {
  /** Unique across the whole DndContext. Activity uuids and mood names both are. */
  id: string;
  payload: DragPayload;
  /** Lit in the tray, and lighting its days on the grid. */
  selected: boolean;
  /** The class that paints a selected row — the same wash its days get. */
  wash: string;
  onSelect: () => void;
  children: ReactNode;
};

/**
 * Makes one tray row liftable, and — since Step 11 — clickable.
 *
 * A real `<button>`, not a div with a mouse listener. `useDraggable` hands back
 * `attributes` containing `tabIndex` and `aria-roledescription`, plus
 * `listeners` for pointer *and* keyboard — so the element has to be something
 * that can hold focus for any of that to work. A button is that for free, and
 * now that clicking one means something, it's also what makes the click work
 * with no extra code.
 *
 * The click and the drag share one element without a guard between them, and
 * that's `activationConstraint: { distance: 4 }` in `CalendarBoard` doing it.
 * Under 4px of travel no drag ever starts, so the browser's click fires
 * normally. At 4px dnd-kit's `handleStart` adds a capture-phase `click`
 * listener on the document that stops propagation for the rest of the gesture —
 * so a drag that happens to end back over its own row does *not* also toggle
 * the highlight. Verified in `@dnd-kit/core`, not assumed; it's the kind of
 * overlap that would otherwise need a "did we just drag?" ref.
 *
 * `aria-pressed` rather than a `role` change: this is a toggle button, and it
 * keeps the `aria-roledescription` of "draggable" that dnd-kit puts on it. Both
 * are true at once.
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
      onClick={props.onSelect}
      aria-pressed={props.selected}
      // TRAY_INSET rather than a local px-2, and no negative margin to cancel
      // it. The padding is what keeps the highlight off the circle; the group
      // label above and the tray header carry the same value, so nothing ends
      // up indented relative to anything else and nothing reaches the rail's
      // edge. See lib/layout.ts for why it's shared rather than written here.
      //
      // Three background states, one slot, so exactly one class wins: dragging
      // (nothing, it's faded anyway), selected (the wash, which is the same
      // colour its days just turned), and neither (the hover band). Written as
      // one chain rather than three appended classes for the Step 5 reason —
      // two backgrounds in one className are resolved by the compiled
      // stylesheet's order, not by the order you typed them.
      className={`${TRAY_INSET} flex min-w-0 flex-1 touch-none items-center gap-2.5 rounded-md py-1 text-left transition-opacity ${
        isDragging
          ? "opacity-35"
          : props.selected
            ? `${props.wash} cursor-grab active:cursor-grabbing`
            : "cursor-grab hover:bg-ink/5 active:cursor-grabbing"
      }`}
    >
      {props.children}
    </button>
  );
}
