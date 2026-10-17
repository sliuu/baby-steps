// Type-only import: no value imports, so `node --test` modules can use this.
import type { DayString } from "@/lib/dates";

// Bundler-free `YYYY-MM-DD` arithmetic (lib/dates.ts imports date-fns).
// All UTC: local days can be 23/25h across DST.

export const MS_PER_DAY = 86_400_000;

/** Day string → UTC midnight ms. */
export function dayToUTC(day: DayString): number {
  return Date.UTC(
    Number(day.slice(0, 4)),
    Number(day.slice(5, 7)) - 1,
    Number(day.slice(8, 10)),
  );
}

/** UTC ms → day string. */
export function utcToDay(ms: number): DayString {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(day: DayString, by: number): DayString {
  return utcToDay(dayToUTC(day) + by * MS_PER_DAY);
}

/** Whole days from `from` to `to`; negative if `to` is earlier. */
export function daysBetween(from: DayString, to: DayString): number {
  return (dayToUTC(to) - dayToUTC(from)) / MS_PER_DAY;
}

/** 0 = Sunday. UTC, or the Americas get the previous day. */
export function weekday(day: DayString): number {
  return new Date(dayToUTC(day)).getUTCDay();
}

/** First day of `day`'s week (0 = Sunday), matching `weekGrid`. Pinned by analytics.test.ts vs lib/dates. */
export function startOfWeek(day: DayString, weekStartsOn: 0 | 1 = 0): DayString {
  return addDays(day, -((weekday(day) - weekStartsOn + 7) % 7));
}
