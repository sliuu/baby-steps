import { LifeAreaChips } from "@/components/LifeAreaChips";
import { getLifeAreas } from "@/lib/queries/lifeAreas";

/**
 * Async, and a Server Component — so the database call happens on the server
 * and the browser receives finished HTML. No loading state, no fetch in the
 * client bundle, no Supabase credentials shipped for this query.
 */
export async function CalendarView() {
  const areas = await getLifeAreas();

  return (
    <section className="rounded-xl border border-dashed border-hairline bg-surface px-10 py-20 text-center">
      <p className="oldstyle text-[0.7rem] uppercase tracking-[0.18em] text-ink-muted">
        July 2026
      </p>
      <h1 className="mt-4 text-4xl font-medium tracking-tight">
        The month goes here
      </h1>
      <p className="mx-auto mt-4 max-w-sm leading-relaxed text-ink-muted">
        A Sunday-start grid of days, with a tray of stickers alongside it.
        Steps 5 through 8 build it.
      </p>

      <div className="mt-10 border-t border-hairline pt-8">
        <p className="oldstyle mb-4 text-[0.7rem] uppercase tracking-[0.18em] text-ink-muted">
          Your life areas
        </p>
        <LifeAreaChips areas={areas} />
      </div>
    </section>
  );
}
