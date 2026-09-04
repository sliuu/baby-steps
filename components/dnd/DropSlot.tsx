"use client";

import { useDroppable } from "@dnd-kit/core";

import type { DayString } from "@/lib/dates";

type Props = {
  day: DayString;
  /** Where a mark dropped here would land: 0 is first, `activities.length` last. */
  index: number;
  /** Whether the thing in the air is currently aimed at this gap. */
  active: boolean;
};

/**
 * The gap between two marks, as a place you can drop something.
 *
 * This is the piece that turns "which day" into "which day, and where in it".
 * The alternative was to make each *mark* a droppable and then work out from the
 * pointer whether you meant before it or after it — which needs the pointer, the
 * mark's rect, and a midpoint test in the drop handler, all to answer a question
 * the gaps could answer by existing. Registering the gaps means dnd-kit's own
 * hit-testing gives back an index directly, and the thing that gets found is the
 * same thing that gets drawn.
 *
 * Zero width, on purpose and load-bearing. The day's marks were fitted to an
 * 85px row a pixel at a time; four carets at 2px each would take a mark's worth
 * of space back out of it and break the fit. So the box occupies nothing and the
 * line is painted absolutely on top of the 2px gap that's already there. The
 * side effect is the one the design wants: aiming at a gap doesn't make the gap
 * open. A text caret doesn't push the letters apart either — it sits between
 * them and the sentence holds still, which is what makes it readable while
 * you're moving.
 *
 * `h-[26px]` matches a mark rather than the 30px line box. It's what the rect is
 * measured as, so a caret's vertical middle lines up with the middle of the
 * marks beside it — which is what the row-picking arithmetic in
 * `CalendarBoard`'s collision detection compares against.
 */
export function DropSlot(props: Props) {
  const { setNodeRef } = useDroppable({
    id: `slot:${props.day}:${props.index}`,
    // `kind` is what the collision detection filters on. Cells and slots are
    // both droppables in one context, and they answer different questions —
    // "which day" and "where in it" — so the two have to be told apart before
    // either is useful.
    data: { kind: "slot", day: props.day, index: props.index },
  });

  return (
    // Nothing here is announced. The caret is feedback for a gesture only a
    // pointer can make; a keyboard drag has no gaps to hover, and the drag
    // announcements say where a mark landed in words instead.
    <span
      ref={setNodeRef}
      aria-hidden="true"
      className="relative inline-block h-[26px] w-0 align-top"
    >
      {props.active && (
        // Pulled a pixel left so the 2px line lands centred in the 2px gap
        // rather than a pixel into the mark that follows it.
        <span className="absolute -left-px top-0 h-full w-0.5 rounded-full bg-ink" />
      )}
    </span>
  );
}
