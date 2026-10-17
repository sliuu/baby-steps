import { Skeleton } from "@/components/ui/skeleton";
import { TRAY_INSET } from "@/lib/layout";

/**
 * The calendar before its queries return. Copies `CalendarBoard`'s outer classes so nothing jumps on handover.
 * Every width lands on Today, so this draws Today.
 */
export function CalendarSkeleton() {
  return (
    <div
      // One announcement for the whole panel. `role="status"` is a polite live
      // region, so a screen reader says this once and is not interrupted; the
      // shapes inside it are empty divs and contribute nothing.
      role="status"
      className="flex flex-col gap-10 lg:flex-row lg:items-start"
    >
      <span className="sr-only">Loading your calendar</span>

      <div className="min-w-0 flex-1">
        <NarrowDaySkeleton />

      </div>

      {/* `lg:w-56` — the rail's real width. It sat at the old 18rem through
          two narrowings, which is a 64px jump sideways at the moment the data
          lands: the skeleton is only worth drawing if the page it hands over
          to is the same shape. (Spelling the stale class name here would emit
          it — the scanner reads comments. See the footnote in
          `lib/layout.ts`.) */}
      <aside className="lg:w-56 lg:shrink-0">
        <div className="flex flex-col gap-7">
          <div className={TRAY_INSET}>
            <Skeleton className="h-6 w-40" />
          </div>

          {/* Three groups of three, which is the shape of a starting tray
              rather than a count of anything. The rail is the shorter column on
              a wide screen, so being a row out here costs nothing — unlike the
              grid, whose height sets the page's. */}
          <div className="flex flex-col gap-7">
            {Array.from({ length: 3 }, (_, group) => (
              <div key={group} className="flex flex-col gap-2">
                <div className={TRAY_INSET}>
                  <Skeleton className="h-3 w-24" />
                </div>
                <ul className="flex flex-col gap-0.5">
                  {Array.from({ length: 3 }, (_, row) => (
                    <li
                      key={row}
                      className={`${TRAY_INSET} flex items-center gap-3 py-1`}
                    >
                      <Skeleton className="size-6 shrink-0 rounded-full" />
                      <Skeleton className="h-3 w-full max-w-28" />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

/** The landing, before its queries come back: `TodayView`, in grey. */
function NarrowDaySkeleton() {
  return (
    <section className="grid gap-11 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-x-16">
      <div className="flex flex-col gap-7.5">
        <header>
          <Skeleton className="h-4 w-20" />
          <Skeleton className="mt-1 h-14 w-64" />
        </header>
        <section>
          <Skeleton className="h-4 w-32" />
          <div className="mt-3.5 grid max-w-md grid-cols-5 gap-1">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        </section>
        <section>
          <Skeleton className="h-4 w-12" />
          <div className="mt-3.5 flex gap-5.5">
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
