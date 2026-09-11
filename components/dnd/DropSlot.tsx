"use client";

import { useDroppable } from "@dnd-kit/core";

import type { DayString } from "@/lib/dates";

/**
 * Which way the marks either side of this slot are flowing.
 *
 * `inline` is a month cell: circles run left to right and wrap, so the caret
 * is a vertical bar between two of them. `block` is a week column: bars stack
 * downwards, so the caret is a horizontal rule across the column.
 *
 * The axis travels in the droppable's `data` as well as in the markup, because
 * the collision detection in `CalendarBoard` has to know which coordinate
 * actually separates one slot from the next. Get that wrong and the caret
 * still draws, in the wrong place, on every drag.
 */
export type SlotAxis = "inline" | "block";

type Props = {
  day: DayString;
  /** Where a mark dropped here would land in the day's order. */
  index: number;
  /** True when this is the slot the current drag would drop into. */
  active: boolean;
  axis?: SlotAxis;
};

export function DropSlot(props: Props) {
  const axis = props.axis ?? "inline";

  const { setNodeRef } = useDroppable({
    id: `slot:${props.day}:${props.index}`,
    data: { kind: "slot", day: props.day, index: props.index, axis },
  });

  // Zero-sized on the axis it divides, so inserting one between every pair of
  // marks moves nothing. It still has a rect on the other axis, which is what
  // dnd-kit measures and what the caret is drawn along.
  return (
    <span
      ref={setNodeRef}
      aria-hidden="true"
      className={
        axis === "inline"
          ? "relative inline-block h-[26px] w-0 align-top"
          : "relative block h-0 w-full"
      }
    >
      {props.active && (
        <span
          className={
            axis === "inline"
              ? "absolute -left-px top-0 h-full w-0.5 rounded-full bg-ink"
              : "absolute -top-px left-0 h-0.5 w-full rounded-full bg-ink"
          }
        />
      )}
    </span>
  );
}
