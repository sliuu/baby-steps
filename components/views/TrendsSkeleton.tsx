import { ChartCard } from "@/components/trends/ChartCard";
import { Skeleton } from "@/components/ui/skeleton";
import { PANEL } from "@/lib/layout";

/** Trends before data: the Categories tab, with TrendsBoard's wrapper classes. */
export function TrendsSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-8">
      <span className="sr-only">loading your trends</span>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-6">
          <Skeleton className="h-9 w-28 sm:h-12 sm:w-36" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="flex items-center justify-between gap-4 lg:justify-end lg:pb-1">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-36" />
        </div>
      </div>

      <div className="grid items-start gap-x-14 gap-y-11 lg:grid-cols-2">
        <div className="hidden lg:block">
          <ChartCard>
            <Skeleton className="size-full rounded-none" />
          </ChartCard>
        </div>

        {/* Six bar rows: every category gets one. */}
        <div className={`flex flex-col gap-3.5 ${PANEL}`}>
          <Skeleton className="mb-1.5 h-6 w-32" />
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="ml-auto h-3 w-6" />
                <Skeleton className="h-3 w-8" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
