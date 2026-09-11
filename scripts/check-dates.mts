// Run with `npm run check:dates`, or in another timezone:
//   TZ=Pacific/Auckland npm run check:dates
//
// Not a test suite — the project has no test runner yet. It exists because the
// date maths is the one part of Step 5 that can be quietly wrong for months.
import {
  formatWeekTitle,
  monthGrid,
  stepMonth,
  stepWeek,
  toDayString,
  toWeekString,
  weekGrid,
  weekdayLabels,
} from "../lib/dates.ts";

function assert(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) console.log(`      expected ${JSON.stringify(expected)}\n      got      ${JSON.stringify(actual)}`);
}

console.log("TZ =", Intl.DateTimeFormat().resolvedOptions().timeZone);

assert("weekday labels start on Sunday", weekdayLabels(), ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);

// July 2026 — the reference screenshot. Starts Wed 1 Jul, so the grid opens on Sun 28 Jun.
const july = monthGrid(new Date(2026, 6, 1), "2026-07-15");
assert("42 cells", july.length, 42);
assert("first cell is 2026-06-28", july[0].day, "2026-06-28");
assert("first cell is out of month", july[0].inMonth, false);
assert("last cell is 2026-08-08", july[41].day, "2026-08-08");
assert("31 days in July are in-month", july.filter((c) => c.inMonth).length, 31);
assert("exactly one cell is today", july.filter((c) => c.isToday).length, 1);
assert("today is the cell we named", july.find((c) => c.isToday)?.day, "2026-07-15");
assert("no today marker when the clock hasn't been read", monthGrid(new Date(2026, 6, 1), null).some((c) => c.isToday), false);

// February 2026 — 28 days starting Sunday. Fits in exactly 4 rows, and we still draw 6.
const feb = monthGrid(new Date(2026, 1, 1), null);
assert("February still gets 42 cells", feb.length, 42);
assert("February opens on the 1st itself", feb[0].day, "2026-02-01");

// A 31-day month starting Friday genuinely needs six rows.
const may = monthGrid(new Date(2026, 4, 1), null);
assert("May 2026 spans six rows", may.filter((c) => c.inMonth).length, 31);
assert("May's last in-month cell is in row 6", Math.floor(may.findLastIndex((c) => c.inMonth) / 7), 5);

// The trap: 11pm local on the 12th is already the 13th in UTC.
const lateNight = new Date(2026, 7, 12, 23, 30);
assert("late-night stays on its own day", toDayString(lateNight), "2026-08-12");
console.log("      toISOString would have said:", lateNight.toISOString().slice(0, 10));

// DST: 8 March 2026 is a spring-forward Sunday in US timezones. The day after
// must still be the 9th, not the 8th again.
const dstMonth = monthGrid(new Date(2026, 2, 1), null);
const dstIndex = dstMonth.findIndex((c) => c.day === "2026-03-08");
assert("the day after spring-forward is the 9th", dstMonth[dstIndex + 1].day, "2026-03-09");

// No duplicate days anywhere in the grid — the React key depends on it.
const days = dstMonth.map((c) => c.day);
assert("every day string is unique", new Set(days).size, 42);

// Stepping across a year boundary.
assert("December + 1 is January", toDayString(stepMonth(new Date(2026, 11, 15), 1)), "2027-01-01");
assert("January - 1 is December", toDayString(stepMonth(new Date(2026, 0, 15), -1)), "2025-12-01");

// --- The week strip -------------------------------------------------------

const week = weekGrid(new Date(2026, 7, 12), "2026-08-12");
assert("7 columns", week.length, 7);
assert("the week opens on Sunday", week[0].day, "2026-08-09");
assert("the week closes on Saturday", week[6].day, "2026-08-15");
assert("each column names its own weekday", week.map((c) => c.weekday), ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
assert("exactly one column is today", week.filter((c) => c.isToday).length, 1);
assert("anchoring on the Sunday gives the same week", weekGrid(new Date(2026, 7, 9), null)[6].day, "2026-08-15");

assert("stepping forward lands on the next Sunday", toDayString(stepWeek(new Date(2026, 7, 12), 1)), "2026-08-16");
assert("stepping back lands on the previous Sunday", toDayString(stepWeek(new Date(2026, 7, 12), -1)), "2026-08-02");
assert("a week can cross a year", toDayString(stepWeek(new Date(2026, 11, 30), 1)), "2027-01-03");

assert("a week inside one month says the month once", formatWeekTitle(new Date(2026, 7, 12)), "9 – 15 August 2026");
assert("a week across two months names both", formatWeekTitle(new Date(2026, 7, 31)), "30 Aug – 5 Sep 2026");
assert("a week across two years names both", formatWeekTitle(new Date(2026, 11, 31)), "27 Dec 2026 – 2 Jan 2027");

assert("the week key is its Sunday", toWeekString(new Date(2026, 7, 12)), "2026-08-09");

// Spring-forward is the week's version of the DST check above: 8 March 2026 is
// 23 hours long, and a `startOfWeek` + `addDays` walk must still produce seven
// distinct days rather than the 8th twice.
const dstWeek = weekGrid(new Date(2026, 2, 10), null);
assert("the spring-forward week has seven distinct days", new Set(dstWeek.map((c) => c.day)).size, 7);
assert("the day after spring-forward is the 9th", dstWeek[1].day, "2026-03-09");
