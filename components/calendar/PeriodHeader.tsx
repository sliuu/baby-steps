import { ChevronLeft, ChevronRight } from "lucide-react";
import { ViewTransition } from "react";

import type { CalendarViewMode } from "./period";

type Props = {
  /** "August 2026", or "9 – 15 August 2026". */
  title: string;
  /** Read-only here. It names the unit in the arrows, nothing more. */
  view: CalendarViewMode;
  onStep: (by: number) => void;
};

/**
 * The line above the calendar: what you're looking at, which way you're
 * looking at it, and the two arrows that move it.
 *
 * One component for both views rather than a `MonthHeader` and a `WeekHeader`,
 * because "same arrows" is a requirement and not a coincidence. Two headers
 * would be two sets of arrows that happen to look alike today, and the first
 * time one of them grew a hover state the other wouldn't.
 *
 * Presentational. It's told what to name and reports presses upward — the same
 * arrangement as `TopNav`, for the same reason.
 *
 * **There used to be a Month/Week pill in here, and it moved to the top nav.**
 * The argument for keeping it local was that month-or-week is a lens on the
 * page you're already on rather than a place you can be sent to. That's still
 * true of the URL, and it turned out not to be the thing that decides: two
 * segmented pills on one screen — this one and the nav's — read as two levels
 * of navigation, and having to find which of them holds Week is worse than the
 * inaccuracy of calling it a section. The nav has three now, and this line is
 * back to being what it says it is: the period, and the two arrows.
 */
export function PeriodHeader(props: Props) {
  const unit = props.view;

  return (
    <div className="flex items-end justify-between gap-6">
      {/* aria-live so a screen reader announces the new period after an arrow
          press. Without it the heading changes silently.

          The live region is the <h1>, and it stays put while the text inside it
          is what gets replaced. That ordering matters: a live region announces
          changes *within* itself, so remounting the region along with its
          contents can leave a screen reader with nothing to report. */}
      <h1 aria-live="polite" className="min-w-0 font-heading text-page-title">
        {/* Crossfades, with no sideways movement — the grid below does the
            travelling. A title sliding the same distance as the grid would read
            as one plane moving, and the period name isn't part of the deck;
            it's the label on it. The arrows sit outside this entirely and never
            move, so there's always one fixed thing to aim at.

            `default="none"` for the same reason as in `CalendarPanel`: every
            sticker commit is a transition, and without it the title would fade
            each time you dropped one. */}
        <ViewTransition
          key={props.title}
          enter="deck-label"
          exit="deck-label"
          default="none"
        >
          {/* `leading-[1.25]` with the extra pulled straight back off as
              negative margin, and the pair is one fix rather than two changes.

              `truncate` is `overflow: hidden`, and `text-page-title` sets
              `line-height: 1` — a 48px line box for a 48px em, which is less
              room than Instrument Serif's glyphs actually occupy. So the box
              clipped whatever hung below the baseline, and the tell was that it
              only happened *sometimes*: "May 2026" was fine and "Sep 2026" lost
              the tail of its p. Widening the line box to 1.25 gives the
              descenders 6px to live in; `-my-[0.125em]` takes the same 6px back
              off the top and bottom margins, so the h1 still measures 48px and
              nothing below it moves. The vertical budget on a 14" screen is
              unchanged.

              Do not swap this for `overflow-visible`: the truncation is what
              stops a long week title from shoving the arrows off the row. */}
          <span className="-my-[0.125em] block truncate leading-[1.25]">
            {props.title}
          </span>
        </ViewTransition>
      </h1>

      <div className="flex shrink-0 items-center gap-1 pb-2">
        <StepArrow direction="previous" unit={unit} onClick={() => props.onStep(-1)} />
        <StepArrow direction="next" unit={unit} onClick={() => props.onStep(1)} />
      </div>
    </div>
  );
}

type ArrowProps = {
  direction: "previous" | "next";
  /** Named in the label, because "Next" alone doesn't say next *what*. */
  unit: CalendarViewMode;
  onClick: () => void;
};

function StepArrow(props: ArrowProps) {
  const Icon = props.direction === "previous" ? ChevronLeft : ChevronRight;
  const word = props.direction === "previous" ? "Previous" : "Next";

  return (
    <button
      type="button"
      onClick={props.onClick}
      aria-label={`${word} ${props.unit}`}
      className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full text-ink-muted transition-colors hover:bg-secondary hover:text-ink"
    >
      <Icon className="size-5" />
    </button>
  );
}
