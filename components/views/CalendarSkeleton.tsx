import { Skeleton } from "@/components/ui/skeleton";
import { RULE, TRAY_INSET } from "@/lib/layout";
import { WEEKS_IN_GRID } from "@/lib/dates";

/**
 * What the Calendar tab looks like before its two queries come back.
 *
 * The outer classes are copied from `CalendarBoard`, and the duplication is the
 * point rather than an oversight. A skeleton's whole job is to reserve the
 * exact space the real thing will take, so that when the data lands the page
 * doesn't jump — the browser reflows when a Suspense fallback is swapped out,
 * and a fallback of the wrong height is a visible lurch on every load. Sharing
 * a layout component between the two would be the usual instinct, but the real
 * board's wrapper is inside a `DndContext` and holds a dozen handlers; the part
 * worth sharing is four class names.
 *
 * What that costs is honest: change the calendar's layout and this has to
 * follow. `WEEKS_IN_GRID` and `TRAY_INSET` are imported rather than retyped
 * because those two are the numbers that would actually drift unnoticed — a
 * six-row grid standing in for a five-row one is exactly the lurch this is
 * supposed to prevent.
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
        <section className="flex flex-col gap-8">
          {/* The month name and its two arrows. `h-12` is the 5xl heading's own
              height, so the grid below starts on the line it will keep. */}
          <div className="flex items-end justify-between gap-6">
            <Skeleton className="h-12 w-64" />
            <div className="flex items-center gap-1 pb-2">
              <Skeleton className="size-9 rounded-full" />
              <Skeleton className="size-9 rounded-full" />
            </div>
          </div>

          {/* The same chrome the real grid uses, down to the hairline
              background showing through a one-pixel gap between cells. Drawing
              the lines for real rather than as a grey slab is what makes this
              read as "the calendar is coming" instead of "something is broken".

              Which is also why the cells are `bg-background`: the month has no
              surface of its own any more, and a skeleton in white would hand
              over to a grid in cream. The box around it went for the same
              reason — the month is a rule above and hairlines inside now, and
              a framed skeleton would pop its own border off the moment the
              data landed. Every number in here is a copy of one in `MonthGrid`
              and `DayCell` — if those change, this is the second place to
              change. */}
          <div className={`${RULE} bg-hairline`}>
            <div className="grid grid-cols-7 gap-px">
              {Array.from({ length: 7 }, (_, i) => (
                <div key={`label-${i}`} className="bg-background py-3">
                  <Skeleton className="mx-auto h-3 w-7" />
                </div>
              ))}

              {/* Always the full six rows, because the real grid always is —
                  see `monthGrid`. A skeleton that guessed five would shrink the
                  page by a row the moment the data arrived. */}
              {Array.from({ length: WEEKS_IN_GRID * 7 }, (_, i) => (
                <div key={i} className="min-h-32 bg-background p-2.5">
                  <Skeleton className="h-4 w-5" />
                </div>
              ))}
            </div>
          </div>
        </section>
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
