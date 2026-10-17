import type { Over } from "@dnd-kit/core";

import type { DayString } from "@/lib/dates";

/** Where a release would land; dnd-kit only knows ids, so this rides in `data`. */
export type DropTarget = { day: DayString; index: number };

/** "The end": callers clamp to the day's length, so no counting needed. */
export const END_OF_DAY = Number.MAX_SAFE_INTEGER;

/** Slot (pointer) gives day + index; day cell (keyboard) lands at the end. */
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

  // A cell's droppable id is the day string.
  return typeof over.id === "string"
    ? { day: over.id, index: END_OF_DAY }
    : null;
}
