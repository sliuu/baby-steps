// No value imports at all, which is what makes this module safe to pull into
// any of the tested ones — see the header of `lib/analytics.ts` for the rule.
// The type import below is erased before Node resolves anything, so it can keep
// the alias.
import type { DayString } from "@/lib/dates";

/**
 * Arithmetic on `YYYY-MM-DD` strings, with no bundler in the room.
 *
 * `lib/dates.ts` is the app's date module and it is the right one to reach for
 * nearly everywhere. It cannot be reached from here: it imports `date-fns`, and
 * the modules that need this arithmetic — `lib/heatmap.ts`, `lib/analytics.ts` —
 * run under `node --test`, where the only resolvable imports are relative paths
 * with a literal extension into modules that themselves import nothing.
 *
 * So this exists as the bundler-free half: no formatting, no locale, no `Date`
 * left in the return type. It moved out of `lib/heatmap.ts` when the mood series
 * became the second caller, which is the same rule `polar` and `firstGrapheme`
 * moved under — on the second caller, not in anticipation of one.
 *
 * **Everything here is UTC, and that is not an implementation detail.** A
 * `DayString` is a calendar square, not an instant: "2026-03-29" is one cell on
 * a grid, and it has to be exactly one day away from the cell beside it. Local
 * time cannot promise that — in a zone with daylight saving, two of the year's
 * days are 23 and 25 hours long, so adding 86,400,000 milliseconds to a local
 * midnight lands at 11pm the same day or 1am the next. In UTC every day is the
 * same length and the arithmetic is exact.
 */

/** Hours × minutes × seconds × milliseconds, named because 86400000 is not. */
export const MS_PER_DAY = 86_400_000;

/**
 * A day string as a UTC timestamp at midnight.
 *
 * Sliced rather than passed to `new Date(day)`, which would also parse it as
 * UTC — but only because `YYYY-MM-DD` is special-cased in the spec, while
 * `YYYY-MM-DDTHH:mm` is not, and that is a distinction nobody should have to
 * hold. Three slices and `Date.UTC` say what they mean.
 */
export function dayToUTC(day: DayString): number {
  return Date.UTC(
    Number(day.slice(0, 4)),
    Number(day.slice(5, 7)) - 1,
    Number(day.slice(8, 10)),
  );
}

/** The inverse. `toISOString` is always UTC, so the first ten characters are
 *  the same calendar square `dayToUTC` was given. */
export function utcToDay(ms: number): DayString {
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * `by` days later, or earlier for a negative `by`.
 *
 * Walks timestamps rather than incrementing the day field, so month ends, leap
 * days and year boundaries are the calendar's problem rather than this
 * function's.
 */
export function addDays(day: DayString, by: number): DayString {
  return utcToDay(dayToUTC(day) + by * MS_PER_DAY);
}

/**
 * Whole days from `from` to `to`. Negative when `to` is the earlier of the two.
 *
 * Exact, not rounded: both ends are UTC midnights, so the difference is always
 * a whole number of `MS_PER_DAY` and there is nothing to round.
 */
export function daysBetween(from: DayString, to: DayString): number {
  return (dayToUTC(to) - dayToUTC(from)) / MS_PER_DAY;
}
