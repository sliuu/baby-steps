import { ChartCard } from "@/components/trends/ChartCard";
import { Skeleton } from "@/components/ui/skeleton";
import { PILL_TRACK } from "@/lib/layout";

/**
 * What the Trends tab looks like before its two queries come back.
 *
 * Same argument as `CalendarSkeleton`: the wrapper classes are `TrendsBoard`'s,
 * copied so the fallback reserves the height the real page will take.
 *
 * **It only draws the Areas tab, and that is the point of tabs paying off.**
 * Only one tab is ever mounted, Areas is always the one you land on, and the
 * other two are behind a click that will happen after the data has arrived.
 * There is nothing to guess about them.
 *
 * The chart panel is the one place this file shares code instead of copying it.
 * `ChartCard` exists precisely because that box has a fixed ratio derived from
 * the chart's viewBox — so it's the element whose height matters most here and
 * the one most likely to be re-tuned later. Rendering the real card with a grey
 * block inside means the skeleton cannot disagree with it. Like the star, it is
 * only there on a wide screen.
 */
export function TrendsSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-5">
      <span className="sr-only">Loading your trends</span>

      <Skeleton className="h-10 w-32 lg:h-12 lg:w-40" />

      <div className="flex flex-col gap-6 lg:gap-8">
        {/* The control band: the tab pill, then the range pill and its dates —
            stacked on a phone, one line on a wide screen. The pill's track is
            the real one, empty: it is the same size loaded or not, and a grey
            bar where it will be is less like the page than the page's own
            track. */}
        <div className="flex flex-col gap-[18px] lg:flex-row lg:items-center lg:justify-between lg:gap-6">
          <div className={`h-[46px] w-full lg:w-[22rem] ${PILL_TRACK}`} />

          <div className="flex items-center justify-between gap-3 lg:justify-end lg:gap-4">
            <Skeleton className="h-9 w-32 rounded-full" />
            <Skeleton className="h-4 w-36" />
          </div>
        </div>

        <div className="grid items-start gap-x-14 gap-y-6 lg:grid-cols-2">
          <div className="hidden lg:block">
            <ChartCard>
              <Skeleton className="size-full rounded-none" />
            </ChartCard>
          </div>

          {/* The bars: six rows of name-and-count over a track, because every
              area gets a row even at zero. Under the page's rule on a wide
              screen, like the real column. */}
          <div className="flex flex-col gap-3.5 lg:border-t-2 lg:border-rule lg:pt-4">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <Skeleton className="size-[9px] shrink-0 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="ml-auto h-3 w-6" />
                  <Skeleton className="h-3 w-8" />
                </div>
                <Skeleton className="h-[7px] w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
