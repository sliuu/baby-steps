import { MonthGrid } from "@/components/calendar/MonthGrid";
import { LifeAreaChips } from "@/components/LifeAreaChips";
import { toMonthString } from "@/lib/dates";
import { getLifeAreas } from "@/lib/queries/lifeAreas";

/**
 * Async, and a Server Component — so the database call happens on the server
 * and the browser receives finished HTML.
 *
 * MonthGrid is a Client Component imported here, which does pull it into the
 * bundle. Unavoidable: the arrows need state. The chips stay server-rendered.
 */
export async function CalendarView() {
  const areas = await getLifeAreas();

  return (
    <div className="flex flex-col gap-12">
      {/* The server's month, so first paint isn't blank. MonthGrid corrects it
          on mount if the visitor's timezone disagrees. */}
      <MonthGrid initialMonth={toMonthString(new Date())} />

      {/* Stands in for the sticker tray until Steps 6 and 7 build it. */}
      <section>
        <p className="mb-4 text-[0.7rem] uppercase tracking-[0.18em] text-ink-muted">
          Your life areas
        </p>
        <LifeAreaChips areas={areas} />
      </section>
    </div>
  );
}
