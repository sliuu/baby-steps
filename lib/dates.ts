import {
  addDays,
  addMonths,
  addWeeks,
  endOfWeek,
  format,
  isSameMonth,
  isSameYear,
  parse,
  startOfMonth,
  startOfWeek,
} from "date-fns";

import type { WeekStart } from "./settings.ts";

/** "10/15/2026". Display only. */
export function formatDateNumeric(date: Date): string {
  return format(date, "M/d/yyyy");
}

/** Today's date: "oct. 17th 2026"; May has no period. */
export function formatDateShort(date: Date): string {
  const month = format(date, "MMM").toLowerCase();
  return `${month}${month === "may" ? "" : "."} ${format(date, "do yyyy")}`;
}

/** A calendar day, as stored in Postgres: "2026-08-12". */
export type DayString = string;

export type DayCellData = {
  day: DayString;
  /** 1–31, for display. */
  dayOfMonth: number;
  /** False for days borrowed from adjacent months. */
  inMonth: boolean;
  isToday: boolean;
};

/** Local YYYY-MM-DD. Not `toISOString`: UTC puts late-night stickers on tomorrow. */
export function toDayString(date: Date): DayString {
  return format(date, "yyyy-MM-dd");
}

/** Today, in the viewer's timezone. */
export function today(): DayString {
  return toDayString(new Date());
}

/** "August 2026". */
export function formatMonthTitle(month: Date): string {
  return format(month, "MMMM yyyy");
}

/** "2026-08-12" → local midnight. Not `new Date(str)`, which parses as UTC. */
export function fromDayString(day: DayString): Date {
  return parse(day, "yyyy-MM-dd", new Date());
}

/** "Wednesday, 12 August 2026": for screen readers, not three numbers. */
export function formatDayLong(day: DayString): string {
  return format(fromDayString(day), "EEEE, d MMMM yyyy");
}

/** "Saturday October 17th". */
export function formatDayHeading(day: DayString): string {
  return format(fromDayString(day), "EEEE MMMM do");
}

/** "12 Aug 2026". `format`, not `toLocaleDateString`: locale differs on hydration. */
export function formatDayShort(day: DayString): string {
  return format(fromDayString(day), "d MMM yyyy");
}

/** "Sunday" / "13 September": the masthead's two faces. No year, to fit 375px. */
export function formatWeekdayLong(day: DayString): string {
  return format(fromDayString(day), "EEEE");
}

export function formatDayTitle(day: DayString): string {
  return format(fromDayString(day), "d MMMM");
}

/** "2026-08": sortable, URL-safe. */
export function toMonthString(month: Date): string {
  return format(month, "yyyy-MM");
}

/** "2026-08" → first of that month, local midnight. */
export function fromMonthString(month: string): Date {
  return parse(month, "yyyy-MM", new Date());
}

export function stepMonth(month: Date, by: number): Date {
  return startOfMonth(addMonths(month, by));
}

export const WEEKS_IN_GRID = 6;

/**
 * Always 42 cells (six weeks) so the grid height never jumps.
 * `todayString` is passed in: server and browser clocks can disagree.
 */
export function monthGrid(
  month: Date,
  todayString: DayString | null,
  weekStartsOn: WeekStart = 0,
): DayCellData[] {
  const firstCell = startOfWeek(startOfMonth(month), { weekStartsOn });
  const cells: DayCellData[] = [];

  for (let i = 0; i < WEEKS_IN_GRID * 7; i++) {
    const date = addDays(firstCell, i);
    const day = toDayString(date);
    cells.push({
      day,
      dayOfMonth: date.getDate(),
      inMonth: isSameMonth(date, month),
      isToday: day === todayString,
    });
  }

  return cells;
}

/** SUN–SAT, derived so labels can't drift from columns. */
export function weekdayLabels(weekStartsOn: WeekStart = 0): string[] {
  const firstCell = startOfWeek(new Date(), { weekStartsOn });
  return Array.from({ length: 7 }, (_, i) =>
    format(addDays(firstCell, i), "EEE"),
  );
}

export type WeekDayData = {
  day: DayString;
  /** 1–31, for display. */
  dayOfMonth: number;
  /** "Mon". */
  weekday: string;
  isToday: boolean;
};

export const DAYS_IN_WEEK = 7;

/** The week around `anchor` (any day). */
export function weekGrid(
  anchor: Date,
  todayString: DayString | null,
  weekStartsOn: WeekStart = 0,
): WeekDayData[] {
  const first = startOfWeek(anchor, { weekStartsOn });

  return Array.from({ length: DAYS_IN_WEEK }, (_, i) => {
    const date = addDays(first, i);
    const day = toDayString(date);
    return {
      day,
      dayOfMonth: date.getDate(),
      weekday: format(date, "EEE"),
      isToday: day === todayString,
    };
  });
}

/** The first day, as a stable key for the week's view transition. */
export function toWeekString(anchor: Date, weekStartsOn: WeekStart = 0): DayString {
  return toDayString(startOfWeek(anchor, { weekStartsOn }));
}

export function stepWeek(anchor: Date, by: number, weekStartsOn: WeekStart = 0): Date {
  return startOfWeek(addWeeks(anchor, by), { weekStartsOn });
}

/** "9 – 15 August 2026"; names each end's month/year when the week straddles. */
export function formatWeekTitle(anchor: Date, weekStartsOn: WeekStart = 0): string {
  const first = startOfWeek(anchor, { weekStartsOn });
  const last = endOfWeek(anchor, { weekStartsOn });

  if (isSameMonth(first, last)) {
    return `${format(first, "d")} – ${format(last, "d MMMM yyyy")}`;
  }
  if (isSameYear(first, last)) {
    return `${format(first, "d MMM")} – ${format(last, "d MMM yyyy")}`;
  }
  return `${format(first, "d MMM yyyy")} – ${format(last, "d MMM yyyy")}`;
}

/** Hand-written short months: "Sept", whole "June"/"July". */
const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "June",
  "July", "Aug", "Sept", "Oct", "Nov", "Dec",
];

/** "13 – 19 Sept 2026": phone week title; same shapes as `formatWeekTitle`. */
export function formatWeekTitleShort(anchor: Date, weekStartsOn: WeekStart = 0): string {
  const first = startOfWeek(anchor, { weekStartsOn });
  const last = endOfWeek(anchor, { weekStartsOn });
  const dayMonth = (date: Date) =>
    `${format(date, "d")} ${SHORT_MONTHS[date.getMonth()]}`;

  if (isSameMonth(first, last)) {
    return `${format(first, "d")} – ${dayMonth(last)} ${format(last, "yyyy")}`;
  }
  if (isSameYear(first, last)) {
    return `${dayMonth(first)} – ${dayMonth(last)} ${format(last, "yyyy")}`;
  }
  return `${dayMonth(first)} ${format(first, "yyyy")} – ${dayMonth(last)} ${format(last, "yyyy")}`;
}
