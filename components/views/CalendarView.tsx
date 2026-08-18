import { MonthGrid } from "@/components/calendar/MonthGrid";
import { LifeAreaChips } from "@/components/LifeAreaChips";
import { toMonthString } from "@/lib/dates";
import { getLifeAreas } from "@/lib/queries/lifeAreas";
import { getStickersByDay } from "@/lib/queries/stickers";

/**
 * Async, and a Server Component — so the database call happens on the server
 * and the browser receives finished HTML.
 *
 * MonthGrid is a Client Component imported here, which does pull it into the
 * bundle. Unavoidable: the arrows need state. The chips stay server-rendered.
 */
export async function CalendarView() {
  // Both queries start before either is awaited, so the page waits for the
  // slower one rather than for the two of them end to end.
  const [areas, stickersByDay] = await Promise.all([
    getLifeAreas(),
    getStickersByDay(),
  ]);

  return (
    <div className="flex flex-col gap-10 lg:flex-row lg:items-start">
      {/* min-w-0 is doing real work: a flex child defaults to refusing to
          shrink below its content's width, so without it a wide grid would
          push the rail off the side instead of narrowing. */}
      <div className="min-w-0 flex-1">
        {/* The server's month, so first paint isn't blank. MonthGrid corrects
            it on mount if the visitor's timezone disagrees. */}
        <MonthGrid
          initialMonth={toMonthString(new Date())}
          stickersByDay={stickersByDay}
        />
      </div>

      {/* Beside the calendar once there's room, stacked underneath when there
          isn't. Sticky below the 4rem nav, so it stays put while a tall month
          scrolls — that matters more once Step 8 makes it a drag source.
          Step 7 fills this in properly. */}
      <aside className="lg:sticky lg:top-24 lg:w-64 lg:shrink-0">
        <p className="mb-4 text-[0.7rem] uppercase tracking-[0.18em] text-ink-muted">
          Your life areas
        </p>
        <LifeAreaChips areas={areas} />
      </aside>
    </div>
  );
}
