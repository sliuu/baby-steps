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

/** A calendar day, as stored in Postgres: "2026-08-12". */
export type DayString = string;

export type DayCellData = {
  day: DayString;
  /** 1–31, for display. */
  dayOfMonth: number;
  /** False for the leading and trailing days borrowed from adjacent months. */
  inMonth: boolean;
  isToday: boolean;
};

/**
 * A `Date` formatted as YYYY-MM-DD using its *local* parts.
 *
 * The obvious alternative is `date.toISOString().slice(0, 10)`, and it is wrong
 * roughly a third of the day. `toISOString` converts to UTC first, so 11pm on
 * the 12th in California is already the 13th in UTC — a sticker placed at night
 * would land on tomorrow. `format` reads the local calendar fields instead.
 */
export function toDayString(date: Date): DayString {
  return format(date, "yyyy-MM-dd");
}

/** Today, in the viewer's own timezone. */
export function today(): DayString {
  return toDayString(new Date());
}

/** "August 2026" — the grid's title. */
export function formatMonthTitle(month: Date): string {
  return format(month, "MMMM yyyy");
}

/**
 * "2026-08-12" back into a `Date` at local midnight.
 *
 * `parse` with an explicit format, not `new Date("2026-08-12")`. The string form
 * is parsed as UTC midnight, which is the previous evening in California — the
 * same trap `toDayString` avoids at the other end.
 *
 * Exported because the range picker needs it: react-day-picker's API is `Date`,
 * while every day in this app is a string. That conversion happens at that one
 * boundary and turns straight back, so this is the inverse of `toDayString` and
 * the pair has to stay honest.
 */
export function fromDayString(day: DayString): Date {
  return parse(day, "yyyy-MM-dd", new Date());
}

/**
 * "Wednesday, 12 August 2026" — for screen reader announcements during a drag,
 * where "2026-08-12" would be read out as three numbers.
 */
export function formatDayLong(day: DayString): string {
  return format(fromDayString(day), "EEEE, d MMMM yyyy");
}

/**
 * "12 Aug 2026" — short enough to sit on a button.
 *
 * `format` rather than `toLocaleDateString`. The browser's locale and the
 * server's are not the same thing, so a locale-formatted date rendered during
 * hydration is a mismatch waiting for the first visitor outside en-US — the same
 * class of bug as reading the clock during render, and harder to notice because
 * it depends on who's looking.
 */
export function formatDayShort(day: DayString): string {
  return format(fromDayString(day), "d MMM yyyy");
}

/** "2026-08" — stable, sortable, and safe in a URL. */
export function toMonthString(month: Date): string {
  return format(month, "yyyy-MM");
}

/** "2026-08" back into a Date at the first of that month, local midnight. */
export function fromMonthString(month: string): Date {
  return parse(month, "yyyy-MM", new Date());
}

export function stepMonth(month: Date, by: number): Date {
  return startOfMonth(addMonths(month, by));
}

/** The number of week rows the grid always draws. */
export const WEEKS_IN_GRID = 6;

/**
 * The 42 cells of a month grid: the month itself, padded at both ends with the
 * days needed to fill whole Sunday-to-Saturday weeks.
 *
 * Always 42, never 35. A month can genuinely need six rows — a 31-day month
 * starting on a Friday spans them — and a grid that changes height between
 * August and September makes the whole page jump on every arrow press.
 *
 * Derived from `month` on every render rather than held in state. There is one
 * source of truth for what the grid shows, and it is which month you're on.
 *
 * `todayString` is passed in rather than read from the clock in here. Calling
 * `isToday()` during render would make the output depend on *where* it runs —
 * and the server and the browser are not always on the same date. See MonthGrid.
 */
export function monthGrid(
  month: Date,
  todayString: DayString | null,
): DayCellData[] {
  const firstCell = startOfWeek(startOfMonth(month)); // Sunday, per date-fns default
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

/** SUN–SAT, for the header row. Derived so the labels can never drift from the columns. */
export function weekdayLabels(): string[] {
  const firstCell = startOfWeek(new Date());
  return Array.from({ length: 7 }, (_, i) =>
    format(addDays(firstCell, i), "EEE"),
  );
}

/* ---------------------------------------------------------------------------
   The week.

   Everything below is the month's arithmetic done one row at a time. The month
   grid borrows days from its neighbours to fill whole weeks; a week borrows
   nothing, so there is no `inMonth` here and no fixed cell count to defend —
   seven columns, always, and every one of them is a real day you can point at.

   What a week column needs and a month cell doesn't is the weekday *on the
   column itself*. The month grid names its columns once, in a header row, and
   the forty-two cells below inherit that naming by position. Seven columns
   can't: they are wide enough to read as seven separate lists rather than as
   one grid, so each one says which day it is.
--------------------------------------------------------------------------- */

/** A day in the week strip — a `DayCellData` with its own weekday name. */
export type WeekDayData = {
  day: DayString;
  /** 1–31, for display. */
  dayOfMonth: number;
  /** "Mon". The column's own label, not a header two rows up. */
  weekday: string;
  isToday: boolean;
};

/** The number of columns the week strip always draws. */
export const DAYS_IN_WEEK = 7;

/**
 * The seven days of the week containing `anchor`, Sunday first.
 *
 * `anchor` is any day inside the week, not the Sunday — the caller steps a date
 * and this finds the week around it, which is what makes `stepWeek` a plain
 * `addWeeks` rather than something that has to stay aligned to a boundary.
 *
 * `todayString` is passed in for the same reason `monthGrid` takes it: reading
 * the clock during render makes the output depend on which machine ran it, and
 * the server and the browser are not always on the same date.
 */
export function weekGrid(
  anchor: Date,
  todayString: DayString | null,
): WeekDayData[] {
  const first = startOfWeek(anchor); // Sunday, per date-fns default

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

/** "2026-08-09" — the Sunday, as a stable key for the week's view transition. */
export function toWeekString(anchor: Date): DayString {
  return toDayString(startOfWeek(anchor));
}

export function stepWeek(anchor: Date, by: number): Date {
  return startOfWeek(addWeeks(anchor, by));
}

/**
 * "9 – 15 August 2026", and the two cases where that isn't enough.
 *
 * A week is the one period in this app that routinely straddles a boundary, so
 * the title has to say which parts are shared and which aren't. Three shapes,
 * narrowest first: inside one month the month and year are said once at the
 * end; across two months of one year each end names its own month; across two
 * years each end names everything. Anything less makes "29 – 4 September" a
 * date range that runs backwards.
 *
 * An en dash with spaces, not a hyphen — this is a range, and at this size the
 * hyphen reads as part of the number next to it.
 */
export function formatWeekTitle(anchor: Date): string {
  const first = startOfWeek(anchor);
  const last = endOfWeek(anchor);

  if (isSameMonth(first, last)) {
    return `${format(first, "d")} – ${format(last, "d MMMM yyyy")}`;
  }
  if (isSameYear(first, last)) {
    return `${format(first, "d MMM")} – ${format(last, "d MMM yyyy")}`;
  }
  return `${format(first, "d MMM yyyy")} – ${format(last, "d MMM yyyy")}`;
}
