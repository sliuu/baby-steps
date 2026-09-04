import type { Over } from "@dnd-kit/core";

import type { DayString } from "@/lib/dates";

/**
 * Where a release would land: a day, and a slot in it.
 *
 * The counterpart to `DragPayload` — that one is what the thing in the air
 * carries, this is what's underneath it. Both exist because dnd-kit's events
 * only know ids, so anything richer than a string has to travel in `data` and
 * be narrowed on the way out.
 */
export type DropTarget = { day: DayString; index: number };

/**
 * "After everything currently on the day", without having to count first.
 *
 * A real number would mean looking up the day's marks in every caller, and then
 * being wrong whenever the lookup and the drop disagree by a row. Both the
 * optimistic redraw and the Server Action clamp an index to the day's length
 * anyway — they have to, because a day can change under a drag — so the honest
 * way to say "the end" is a number no day can reach and let the clamp mean it.
 */
export const END_OF_DAY = Number.MAX_SAFE_INTEGER;

/**
 * What's under the cursor, whichever kind of droppable it turned out to be.
 *
 * Two shapes reach here. A slot knows its own day and index, which is the
 * pointer case and the interesting one. A day cell knows only the day — that's
 * the keyboard case, where there are no gaps to aim at and dnd-kit is picking
 * whole squares — so it lands at the end.
 */
export function readDropTarget(over: Over | null): DropTarget | null {
  if (!over) return null;

  const data = over.data.current;
  if (
    data?.kind === "slot" &&
    typeof data.day === "string" &&
    typeof data.index === "number"
  ) {
    return { day: data.day, index: data.index };
  }

  // The cell's droppable id *is* the day string, which is why a drop needed no
  // lookup table before slots existed.
  return typeof over.id === "string"
    ? { day: over.id, index: END_OF_DAY }
    : null;
}
