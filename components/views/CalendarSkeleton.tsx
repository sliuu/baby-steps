import { Skeleton } from "@/components/ui/skeleton";

/** Calendar placeholder (draws Today); copies `CalendarBoard`'s outer classes. */
export function CalendarSkeleton() {
  return (
    <div
      // One polite announcement; the shapes are silent.
      role="status"
      className="flex flex-col"
    >
      <span className="sr-only">Loading your calendar</span>

      <div className="min-w-0 flex-1">
        <NarrowDaySkeleton />
      </div>

      {/* The tray under Today: three groups of tiles. */}
      <div className="mt-s6 border-t border-rule pt-s6">
        <Skeleton className="h-4 w-28" />
        <div className="mt-s4 grid gap-x-s6 gap-y-s5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, group) => (
            <div key={group}>
              <Skeleton className="h-3 w-24" />
              <ul className="mt-s2 flex gap-s1">
                {Array.from({ length: 3 }, (_, tile) => (
                  <li key={tile} className="flex w-16 flex-col items-center gap-1.5">
                    <Skeleton className="size-sticker-sm rounded-full" />
                    <Skeleton className="h-2.5 w-10" />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** The landing, before its queries come back: `TodayView`, in grey. */
function NarrowDaySkeleton() {
  return (
    <section className="grid gap-s6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-x-s7">
      <div className="flex flex-col gap-s5">
        <header>
          <Skeleton className="h-4 w-20" />
          <Skeleton className="mt-1 h-14 w-64" />
        </header>
        <section>
          <Skeleton className="h-4 w-32" />
          <div className="mt-s2 grid max-w-md grid-cols-5 gap-1">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        </section>
        <section>
          <Skeleton className="h-4 w-12" />
          <div className="mt-s2 flex gap-s4">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="size-sticker-lg rounded-full" />
            ))}
          </div>
        </section>
        <Skeleton className="h-9" />
      </div>
      <Skeleton className="mx-auto aspect-square w-full max-w-80 rounded-full" />
    </section>
  );
}
