import { ChevronLeft, ChevronRight } from "lucide-react";
import { ViewTransition } from "react";

import { formatMonthTitle } from "@/lib/dates";

type Props = {
  month: Date;
  onStep: (by: number) => void;
};

/**
 * Presentational. It's told which month to name and reports arrow presses
 * upward — the same arrangement as TopNav, for the same reason.
 */
export function MonthHeader(props: Props) {
  const title = formatMonthTitle(props.month);

  return (
    <div className="flex items-end justify-between gap-6">
      {/* aria-live so a screen reader announces the new month after an arrow
          press. Without it the heading changes silently.

          The live region is the <h1>, and it stays put while the text inside it
          is what gets replaced. That ordering matters: a live region announces
          changes *within* itself, so remounting the region along with its
          contents can leave a screen reader with nothing to report. */}
      <h1
        aria-live="polite"
        className="font-heading text-page-title"
      >
        {/* Crossfades, with no sideways movement — the grid below does the
            travelling. A title sliding the same distance as the grid would read
            as one plane moving, and the month name isn't part of the deck; it's
            the label on it. The arrows sit outside this entirely and never
            move, so there's always one fixed thing to aim at.

            `default="none"` for the same reason as in `MonthGrid`: every
            sticker commit is a transition, and without it the title would fade
            each time you dropped one. */}
        <ViewTransition key={title} enter="deck-label" exit="deck-label" default="none">
          <span className="block">{title}</span>
        </ViewTransition>
      </h1>

      <div className="flex items-center gap-1 pb-2">
        <MonthArrow direction="previous" onClick={() => props.onStep(-1)} />
        <MonthArrow direction="next" onClick={() => props.onStep(1)} />
      </div>
    </div>
  );
}

type ArrowProps = {
  direction: "previous" | "next";
  onClick: () => void;
};

function MonthArrow(props: ArrowProps) {
  const Icon = props.direction === "previous" ? ChevronLeft : ChevronRight;

  return (
    <button
      type="button"
      onClick={props.onClick}
      aria-label={`${props.direction === "previous" ? "Previous" : "Next"} month`}
      className="grid size-9 shrink-0 place-items-center rounded-full text-ink-muted transition-colors hover:bg-secondary hover:text-ink"
    >
      <Icon className="size-5" />
    </button>
  );
}
