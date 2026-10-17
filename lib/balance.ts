// Relative imports with extensions, for `node --test` (see lib/analytics.ts).
import type { DayString } from "@/lib/dates";
import { addDays, daysBetween, weekday } from "./daymath.ts";
import { DEFAULT_SETTINGS, type PetalRule, type WeekStart } from "./settings.ts";

export type Level = 0 | 1 | 2 | 3;
export type Balance = Record<string /* category id */, Level>;

/** Local yyyy-mm-dd. */
function localDay(date: Date): DayString {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

function weekStart(day: DayString, weekStartsOn: WeekStart): DayString {
  return addDays(day, -((weekday(day) - weekStartsOn + 7) % 7));
}

/** Level from sticker counts over the last `rule.weeks` calendar weeks (current included). */
export function balanceLevels(input: {
  categories: { id: string }[];
  days: { day: string; categoryIds: string[] }[];
  today: Date;
  weekStartsOn?: WeekStart;
  rule?: PetalRule;
}): Balance {
  const startsOn = input.weekStartsOn ?? 0;
  const rule = input.rule ?? DEFAULT_SETTINGS.petals;
  const thisWeek = weekStart(localDay(input.today), startsOn);
  const counts = new Map<string, number>(input.categories.map((category) => [category.id, 0]));

  for (const { day, categoryIds } of input.days) {
    const back = daysBetween(weekStart(day, startsOn), thisWeek) / 7;
    if (back < 0 || back >= rule.weeks) continue;
    for (const id of categoryIds) {
      const n = counts.get(id);
      if (n !== undefined) counts.set(id, n + 1);
    }
  }

  const balance: Balance = {};
  for (const [id, n] of counts) {
    balance[id] = n >= rule.large ? 3 : n >= rule.medium ? 2 : n >= rule.small ? 1 : 0;
  }
  return balance;
}

/** max − min level; 0 when empty. */
export function balanceSpread(b: Balance): number {
  const levels = Object.values(b);
  if (levels.length === 0) return 0;
  return Math.max(...levels) - Math.min(...levels);
}

/** Onboarding line under the pie; ties go to the first category. Copy is Stephanie's. */
export function verdict(levels: Balance, categories: { id: string; name: string }[]): string {
  const level = (c: { id: string }) => levels[c.id] ?? 0;
  const all = Object.fromEntries(categories.map((c) => [c.id, level(c)]));
  if (balanceSpread(all) <= 1) {
    return "looks like your pie is well balanced! let's try to keep it that way";
  }
  let lowest = categories[0];
  let highest = categories[0];
  for (const c of categories) {
    if (level(c) < level(lowest)) lowest = c;
    if (level(c) > level(highest)) highest = c;
  }
  return `looks like ${lowest.name.toLowerCase()} is trailing behind, but you're filling your cup with ${highest.name.toLowerCase()}`;
}
