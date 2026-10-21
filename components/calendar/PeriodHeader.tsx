import { ChevronLeft, ChevronRight } from "lucide-react";
import { ViewTransition } from "react";

import type { CalendarViewMode } from "./period";
import { Button } from "@/components/ui/button";
import { TITLE } from "@/lib/layout";
import { cn } from "@/lib/utils";

type SteppablePeriod = Exclude<CalendarViewMode, "today">;

type Props = {
  /** "october" (year only outside this one), or "11 – 17 october 2026". */
  title: string;
  /** Shorter title below lg. */
  shortTitle?: string;
  view: SteppablePeriod;
  onStep: (by: number) => void;
};

/** Title, `month · week`, and the arrows. */
export function PeriodHeader(props: Props) {
  return (
    // Toggle drops under the title on phones, so the title fits.
    <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-s4">
      {/* Arrows beside the title they change; quiet, no outlines. */}
      <div className="flex min-w-0 items-center gap-s1">
        {/* Today's question's face. Stays mounted for aria-live. */}
        <h1 aria-live="polite" className={`${TITLE} min-w-0 lowercase`}>
          {/* Crossfade only; the grid does the travelling. */}
          <ViewTransition key={props.title} enter="deck-label" exit="deck-label" default="none">
            {/* leading 1.25 + negative margin: room for descenders under truncate. */}
            <span className="-my-[0.125em] block truncate leading-[1.25]">
              {props.shortTitle ? (
                <>
                  <span className="lg:hidden">{props.shortTitle}</span>
                  <span className="hidden lg:inline">{props.title}</span>
                </>
              ) : (
                props.title
              )}
            </span>
          </ViewTransition>
        </h1>

        <div className="flex shrink-0 items-center">
          <Button variant="ghost" size="icon-sm" className="text-ink-muted hover:text-ink" aria-label={`previous ${props.view}`} onClick={() => props.onStep(-1)}>
            <ChevronLeft strokeWidth={1.5} />
          </Button>
          <Button variant="ghost" size="icon-sm" className="text-ink-muted hover:text-ink" aria-label={`next ${props.view}`} onClick={() => props.onStep(1)}>
            <ChevronRight strokeWidth={1.5} />
          </Button>
        </div>
      </div>

      {/* Hash links: AppShell follows the hash. */}
      <nav aria-label="calendar view" className="shrink-0 text-label text-ink-muted">
        <ViewLink view="month" current={props.view} />
        <span aria-hidden="true"> · </span>
        <ViewLink view="week" current={props.view} />
      </nav>
    </div>
  );
}

function ViewLink(props: { view: SteppablePeriod; current: SteppablePeriod }) {
  const on = props.view === props.current;
  return (
    <a
      href={`#${props.view}`}
      aria-current={on ? "page" : undefined}
      className={cn(
        "underline-offset-4 hover:text-ink",
        on && "text-ink underline decoration-ink",
      )}
    >
      {props.view}
    </a>
  );
}
