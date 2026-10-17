// Relative imports with extensions, for `node --test` (see lib/analytics.ts).
import type { DayString } from "@/lib/dates";
import { addDays, daysBetween, weekday } from "./daymath.ts";

export type Level = 0 | 1 | 2 | 3;
export type Balance = Record<string /* category id */, Level>;

/** Weeks counted, the current one included. */
export const BALANCE_WEEKS = 3;

/** Local yyyy-mm-dd. */
function localDay(date: Date): DayString {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

function weekStart(day: DayString, weekStartsOn: 0 | 1): DayString {
  return addDays(day, -((weekday(day) - weekStartsOn + 7) % 7));
}

/** Level = how many of the last 3 calendar weeks have a sticker in that category. */
export function balanceLevels(input: {
  categories: { id: string }[];
  days: { day: string; categoryIds: string[] }[];
  today: Date;
  /** 0 = Sunday, like the calendar. */
  weekStartsOn?: 0 | 1;
}): Balance {
  const startsOn = input.weekStartsOn ?? 0;
  const thisWeek = weekStart(localDay(input.today), startsOn);
  const weeks = new Map<string, Set<number>>(
    input.categories.map((category) => [category.id, new Set()]),
  );

  for (const { day, categoryIds } of input.days) {
    const back = daysBetween(weekStart(day, startsOn), thisWeek) / 7;
    if (back < 0 || back >= BALANCE_WEEKS) continue;
    for (const id of categoryIds) weeks.get(id)?.add(back);
  }

  const balance: Balance = {};
  for (const [id, seen] of weeks) balance[id] = seen.size as Level;
  return balance;
}

/** max − min level; 0 when empty. */
export function balanceSpread(b: Balance): number {
  const levels = Object.values(b);
  if (levels.length === 0) return 0;
  return Math.max(...levels) - Math.min(...levels);
}
