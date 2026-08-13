import { ChevronLeft, ChevronRight } from "lucide-react";

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
  return (
    <div className="flex items-end justify-between gap-6">
      {/* aria-live so a screen reader announces the new month after an arrow
          press. Without it the heading changes silently. */}
      <h1
        aria-live="polite"
        className="font-heading text-5xl font-medium tracking-tight"
      >
        {formatMonthTitle(props.month)}
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
      className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full text-ink-muted transition-colors hover:bg-secondary hover:text-ink"
    >
      <Icon className="size-5" />
    </button>
  );
}
