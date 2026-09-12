import { ChartCard } from "@/components/trends/ChartCard";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * What the Trends tab looks like before its two queries come back.
 *
 * Same argument as `CalendarSkeleton`: the wrapper classes are `TrendsBoard`'s,
 * copied so the fallback reserves the height the real page will take.
 *
 * **It only draws the Areas tab, and that is the point of tabs paying off.**
 * The old version reserved a star, a ranking, a readout and a habit strip
 * stacked down the page, because all four were on screen at once — so it had to
 * guess four heights and was wrong about at least one of them every time. Only
 * one tab is ever mounted, Areas is always the one you land on, and the other
 * two are behind a click that will happen after the data has arrived. There is
 * nothing left to guess about them.
 *
 * The chart panel is the one place this file shares code instead of copying it.
 * `ChartCard` exists precisely because that box has a fixed ratio derived from
 * the chart's viewBox — so it's the element whose height matters most here and
 * the one most likely to be re-tuned later. Rendering the real card with a grey
 * block inside means the skeleton cannot disagree with it.
 */
export function TrendsSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-5">
      <span className="sr-only">Loading your trends</span>

      <Skeleton className="h-12 w-40" />

      <div className="flex flex-col gap-8">
        {/* The control band: three tabs on the left, the range dropdown and
            the dates it resolves to on the right. */}
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          {/* Three triggers, at roughly the widths "Areas", "Habits" and
              "Moods" take. Literal classes rather than a computed width:
              Tailwind reads the source text, it never runs it. */}
          <div className="flex items-center gap-1">
            <Skeleton className="h-8 w-[4.5rem]" />
            <Skeleton className="h-8 w-[4.75rem]" />
            <Skeleton className="h-8 w-[4.75rem]" />
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Skeleton className="h-9 w-36 rounded-full" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>

        <div className="grid items-start gap-x-14 gap-y-10 lg:grid-cols-2">
          <ChartCard>
            {/* Square, since the panel stopped being a rounded card — a
                rounded grey block under a straight rule is a shape the real
                thing no longer has. */}
            <Skeleton className="size-full rounded-none" />
          </ChartCard>

          {/* The readout: a sentence, then the table. Two lines and a short
              third is the shape of the takeaway paragraph — it wraps to about
              that at this column width, and guessing one line would leave the
              table jumping up when the real sentence arrives. */}
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2.5">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-2/3" />
            </div>

            <div className="flex flex-col gap-4">
              {/* The header row, then one row per life area. Six, because six
                  is how many areas there are — every one gets a row even at
                  zero, which is the table's own rule. */}
              <div className="flex items-center gap-4">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="ml-auto h-3 w-10" />
                <Skeleton className="h-3 w-10" />
              </div>
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="size-2.5 shrink-0 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="ml-auto h-4 w-8" />
                  <Skeleton className="h-4 w-10" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
