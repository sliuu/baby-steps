"use client";

import { useDroppable } from "@dnd-kit/core";

import type { DayString } from "@/lib/dates";

/** `inline`: month cell. `block`: week column. Also in `data` for collision. */
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

  // Zero-size on its axis so it moves nothing; dnd-kit measures the other one.
  return (
    <span
      ref={setNodeRef}
      aria-hidden="true"
      className={
        axis === "inline"
          ? "relative inline-block h-5 w-0 align-top"
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
