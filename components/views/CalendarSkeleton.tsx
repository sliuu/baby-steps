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
 *
 * **There are two of them now, and CSS picks.** This drew the desktop month at
 * every width for as long as there was only one month to draw, and the day the
 * phone got its own the omission became the worst lurch in the app: 42 cells at
 * `min-h-32` is a 5,000px column of grey that collapses to a 300px dot grid the
 * moment the queries land. A fallback of the wrong height is the one thing a
 * skeleton must never be, and "the wrong height" now depends on the window. So
 * the shape is chosen the same way the real calendar chooses it — both drawn,
 * one hidden — and for the same reason: the server has no window to measure, so
 * anything decided in JavaScript is decided too late to matter here. A skeleton
 * corrected after hydration has already done the damage it exists to prevent.
 *
 * **And the narrow one is a day, not a month.** It was a month for one round of
 * this, which was the same mistake one level along: a cold load on a phone
 * lands on Today — see `LANDING_NARROW` in `lib/nav.ts` — so a phone-shaped
 * month grid here is a skeleton of a screen the visitor was never going to be
 * shown. It handed over to a masthead and a sticker list, which is a lurch
 * that reads as the page changing its mind. The pairing is the rule: the
 * fallback for a landing is a drawing of *that* landing, and there are two
 * landings.
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

        {/* `gap-6`, which is `CalendarPanel`'s own number for this section —
            the skeleton had 8 and the handover moved everything below the
            header by 8px. */}
        <section className="hidden flex-col gap-6 lg:flex">
          {/* The month name and its two arrows. `PAGE_TITLE`'s wide size is
              48px; the arrows are 36px at every width. The phone's copy of
              this line lives in `NarrowDaySkeleton`, where it has no arrows
              at all, because the day view steps by tapping its own strip. */}
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

/**
 * The phone's landing, before its queries come back: `TodayView`, in grey.
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
    <section className="flex flex-col gap-9 lg:hidden">
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
