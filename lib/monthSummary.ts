// No value imports, so `node --test` can load this module without a bundler —
// the rule is written out in the header of `lib/analytics.ts`. The two imports
// below are types and are erased before Node resolves anything, so they keep
// the alias.
import type { DayString } from "@/lib/dates";
import type { StickersByDay } from "@/lib/stickers";

/** One habit in the "most marked" list, with its own drawing. */
export type MonthLeader = {
  activityId: string;
  name: string;
  mark: string;
  colorKey: string;
  count: number;
  /** "about every 3 days". See `cadence`. */
  cadence: string;
};

export type MonthSummary = {
  /** Days in the month that have at least one sticker on them. */
  daysMarked: number;
  /** Stickers placed, counting a habit once per day it appears on. */
  stickers: number;
  /** Life areas with at least one sticker in the month. */
  areas: number;
  /** Days of the month that have actually happened. See `elapsedDays`. */
  elapsed: number;
  /** The three most-marked habits, most first. Shorter if there aren't three. */
  leaders: MonthLeader[];
};

/** How many of the month's own days are on or before today. */
export function elapsedDays(
  days: DayString[],
  todayString: DayString | null,
): number {
  // Null is the server and the hydrating browser — see `CalendarPanel`. The
  // honest answer there is the whole month: it is what a past month gets, it
  // is right for eleven months out of twelve, and the browser corrects it on
  // the render straight after hydration.
  if (!todayString) return days.length;

  // `YYYY-MM-DD` sorts as a string exactly as it sorts as a date, which is the
  // whole reason this app stores days as strings. No parsing, no timezone.
  return days.filter((day) => day <= todayString).length;
}

/**
 * How often a habit came round, in words.
 *
 * Always "about every", and always whole days. A habit done nine times in
 * eighteen elapsed days is not *every* two days — it is nine times, in some
 * arrangement this sentence deliberately does not describe. The hedge is what
 * keeps the figure a rhythm rather than a score, which is the difference
 * between this line and a streak counter.
 *
 * `Math.round` rather than a floor: five times in thirteen days is one every
 * 2.6, and a floor calls that "every 2 days" — an overstatement of somebody's
 * own habit, which is the one direction this app should never round. And a
 * floor of 1 underneath it, because "about every 0 days" is not a sentence,
 * and twice in a day is still, roughly, every day.
 */
export function cadence(count: number, elapsed: number): string {
  if (count <= 0 || elapsed <= 0) return "";

  const every = Math.max(1, Math.round(elapsed / count));
  return every === 1 ? "about every day" : `about every ${every} days`;
}

/**
 * What a month adds up to: three figures and the habits behind them.
 *
 * Counted over the month's *own* days, which is why the caller passes them in
 * rather than passing the grid: a month grid is 42 cells and up to eleven of
 * them belong to the neighbours, and a September summary that counted two days
 * of August would be wrong in a way nobody would ever catch by looking.
 *
 * **`areaOf` is a map from activity to life area, and the fallback matters.**
 * A sticker on a day carries its hue but not the area it came from, and the
 * two are not the same question — six areas happen to have six hues today,
 * and nothing stops a seventh area picking a hue already in use. So the map is
 * built from the library and consulted first. A placement whose activity is
 * not in the library any more (deleted, or simply not loaded) falls back to
 * its hue, which is the closest thing to an area it still knows about.
 *
 * Nothing in here reads a clock or a locale. That is what lets it be tested,
 * and it is the same rule `monthGrid` follows for the same reason.
 */
export function monthSummary(
  days: DayString[],
  stickersByDay: StickersByDay,
  areaOf: Map<string, string>,
  todayString: DayString | null,
): MonthSummary {
  const elapsed = elapsedDays(days, todayString);

  const areas = new Set<string>();
  const counts = new Map<string, MonthLeader>();
  let daysMarked = 0;
  let stickers = 0;

  for (const day of days) {
    if (todayString && day > todayString) continue;
    const onDay = stickersByDay.get(day);
    if (!onDay || onDay.activities.length === 0) continue;

    daysMarked++;
    stickers += onDay.activities.length;

    for (const sticker of onDay.activities) {
      areas.add(areaOf.get(sticker.activityId) ?? `hue:${sticker.colorKey}`);

      const seen = counts.get(sticker.activityId);
      if (seen) {
        seen.count++;
        continue;
      }
      counts.set(sticker.activityId, {
        activityId: sticker.activityId,
        name: sticker.name,
        mark: sticker.mark,
        colorKey: sticker.colorKey,
        count: 1,
        // Filled in below: the cadence needs the final count, and mutating a
        // string here once per placement would be the same arithmetic done
        // twenty-eight times for one answer.
        cadence: "",
      });
    }
  }

  const leaders = [...counts.values()]
    // Count first, then name, so two habits on four each come out in a stable
    // order rather than in whichever order the month happened to be filled in.
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 3)
    .map((leader) => ({ ...leader, cadence: cadence(leader.count, elapsed) }));

  return { daysMarked, stickers, areas: areas.size, elapsed, leaders };
}
