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
  /**
   * What a click means. Opening the sticker's editor, for the fifteen rows that
   * have one.
   *
   * Optional, and the five moods are why: a mood has nothing behind it to open,
   * so its row is a drag handle and only that. It stays a focusable `<button>`
   * regardless — that isn't decoration either, it's what lets Space pick the
   * mood up without a mouse.
   */
  onActivate?: () => void;
  /**
   * The accessible name, when the visible text isn't the whole story.
   *
   * "Gym" is what the row says; "Edit Gym" is what the button does. Passing the
   * longer phrase is allowed precisely because it still *contains* the visible
   * word — that's the Label in Name rule, and it's what keeps "click Gym"
   * working for someone driving the page by voice.
   */
  label?: string;
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
 * so a drag that happens to end back over its own row does *not* also open the
 * editor. Verified in `@dnd-kit/core`, not assumed; it's the kind of overlap
 * that would otherwise need a "did we just drag?" ref.
 *
 * What the click *means* changed after Step 16. It used to toggle the
 * highlight, and the row carried `aria-pressed` to say so. Both moved to the
 * eye button beside it: a row named "Gym" that opens Gym is the ordinary
 * reading of a click on a named thing, and the highlight — which was the
 * feature with no affordance at all — got a real one. The row keeps `wash`,
 * because being lit is still something it looks like; it just isn't something
 * it does any more.
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
      onClick={props.onActivate}
      aria-label={props.label}
      // TRAY_INSET rather than a local px-2, and no negative margin to cancel
      // it. The padding is what keeps the highlight off the circle; the group
      // label above and the tray header carry the same value, so nothing ends
      // up indented relative to anything else and nothing reaches the rail's
      // edge. See lib/layout.ts for why it's shared rather than written here.
      //
      // The gap is for the circle-and-name body and inert under the bar, which
      // is one child and fills the row. Kept rather than made conditional: a
      // gap with nothing to separate costs nothing, and the alternative is the
      // row's layout changing shape along with its contents. The padding is
      // the same in both, which is what keeps the rail's rhythm — a 26px bar
      // is exactly as tall as the 26px circle, so nothing in the list moves
      // when the view switches.
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
