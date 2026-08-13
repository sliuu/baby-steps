import {
  addDays,
  addMonths,
  format,
  isSameMonth,
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
