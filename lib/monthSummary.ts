// Type imports only, so `node --test` loads this without a bundler.
import type { DayString } from "@/lib/dates";
import type { StickersByDay } from "@/lib/stickers";

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
  /** Days with at least one sticker. */
  daysMarked: number;
  /** Counting a habit once per day. */
  stickers: number;
  categories: number;
  /** Days that have happened. See `elapsedDays`. */
  elapsed: number;
  /** Top three habits, most first. */
  leaders: MonthLeader[];
};

/** Month days on or before today. */
export function elapsedDays(
  days: DayString[],
  todayString: DayString | null,
): number {
  // Null on server/hydration: assume the whole month; the client corrects it.
  if (!todayString) return days.length;

  // YYYY-MM-DD compares as strings; no parsing.
  return days.filter((day) => day <= todayString).length;
}

/** "about every N days": hedged, rounded (not floored, which overstates), min 1. */
export function cadence(count: number, elapsed: number): string {
  if (count <= 0 || elapsed <= 0) return "";

  const every = Math.max(1, Math.round(elapsed / count));
  return every === 1 ? "about every day" : `about every ${every} days`;
}

/**
 * Figures over the month's own days (not the 42-cell grid). `categoryOf` maps
 * activity → category; unknown activities fall back to their hue. Pure: no clock.
 */
export function monthSummary(
  days: DayString[],
  stickersByDay: StickersByDay,
  categoryOf: Map<string, string>,
  todayString: DayString | null,
): MonthSummary {
  const elapsed = elapsedDays(days, todayString);

  const categories = new Set<string>();
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
      categories.add(categoryOf.get(sticker.activityId) ?? `hue:${sticker.colorKey}`);

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
        // Filled in below once counts are final.
        cadence: "",
      });
    }
  }

  const leaders = [...counts.values()]
    // Tie-break by name for a stable order.
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 3)
    .map((leader) => ({ ...leader, cadence: cadence(leader.count, elapsed) }));

  return { daysMarked, stickers, categories: categories.size, elapsed, leaders };
}
