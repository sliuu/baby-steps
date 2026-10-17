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

/**
 * The landing, before its queries come back: `TodayView`, in grey.
 *
 * Every number in here is a copy of one in `TodayView` — `gap-9` between the
 * blocks, the 64px strip and mood cells, the 44px add button — because the one
 * thing this has to get right is the height of what replaces it.
 *
 * Two sticker rows, and that is a shape rather than a count. A day has however
 * many stickers it has, so no number is right; two is what an ordinary day
 * looks like, and the list is the last full-width block above the note, so
 * being a row out moves only the note. The alternative — reserving nothing —
 * would collapse the page upward every time a day turned out to have anything
 * on it at all.
 */
function NarrowDaySkeleton() {
  return (
    <section className="flex flex-col gap-9">
      <header>
        {/* The weekday over the date. 2rem at 1.25 leading is a 40px title on
            a phone; the eyebrow above it is Space Mono at about 10px. */}
        <Skeleton className="h-2.5 w-24" />
        <Skeleton className="mt-1 h-10 w-48" />
      </header>

      <div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }, (_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
        <Skeleton className="mx-auto mt-2 h-3 w-40" />
      </div>

      <section>
        <Skeleton className="h-2.5 w-20" />
        <div className="mt-3 grid grid-cols-5 gap-1">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      </section>

      <section>
        <Skeleton className="h-2.5 w-16" />
        <div className="mt-3 flex flex-col gap-2">
          {Array.from({ length: 2 }, (_, i) => (
            /* The × beside each bar is 36px of gutter, and the dashed add
               button below stops short of it too — so the grey stops where the
               real row stops rather than running to the page edge. */
            <Skeleton key={i} className="h-9 w-[calc(100%-2.5rem)]" />
          ))}
        </div>
        <Skeleton className="mt-2 h-11 w-[calc(100%-2.5rem)] rounded-sm" />
      </section>

      <section>
        <Skeleton className="h-2.5 w-12" />
        {/* `DayNote` draws its own hairline and gives an empty field two lines
            of floor. Both are copied here, the line for real. */}
        <div className="mt-2 border-t border-hairline pt-1.5">
          <Skeleton className="h-[2.3rem]" />
        </div>
      </section>
    </section>
  );
}
