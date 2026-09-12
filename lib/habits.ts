// One value import, relative and with its extension, into a module that itself
// imports nothing — the rule `lib/analytics.ts` states and `lib/heatmap.ts`
// repeats: what bites under `node --test` is depth, not count. Everything below
// it is `import type` and is erased before Node resolves a path, so those keep
// the `@/` alias the bundler understands.
import { daysBetween } from "./daymath.ts";
import type { Bounds } from "@/lib/analytics";
import type { DayString } from "@/lib/dates";
import type { LibraryGroup } from "@/lib/queries/activities";
import type { StickersByDay } from "@/lib/stickers";

/**
 * Two closed edges and the number of days between them, inclusive.
 *
 * `Bounds` has open sides — "all time" is two nulls — and every column of the
 * habit table needs a real span: a rate needs a denominator and a plot needs
 * something to be a percentage of. So the open sides get closed once, here,
 * and everything downstream works in whole days.
 *
 * `days` is stored rather than derived at each use because it is the
 * denominator of every frequency on the page. One number, computed once, is
 * one number to be wrong — two rows cannot disagree about how long the period
 * was.
 */
export type HabitWindow = { from: DayString; to: DayString; days: number };

/**
 * The earliest day anything was ever placed, or null for an empty history.
 *
 * The map is keyed by day and not sorted, so this is a scan. It is what closes
 * the left edge of an "all time" window: the alternative is starting the plot
 * at the epoch, which draws every habit as a single tick against a wall of
 * empty track.
 *
 * Days with an entry but nothing on them don't count. A day can be in the map
 * carrying only a mood or a note — the calendar writes those — and a window
 * that started at the first day you *felt* something would be a different
 * window from the one the counts are about.
 */
export function earliestPlacement(stickersByDay: StickersByDay): DayString | null {
  let earliest: DayString | null = null;

  for (const [day, stickers] of stickersByDay) {
    if (stickers.activities.length === 0) continue;
    if (!earliest || day < earliest) earliest = day;
  }

  return earliest;
}

/**
 * A range's bounds, closed into a window the table can measure against.
 *
 * The right edge is today when the range is open on that side, because a habit
 * tracker's "now" is the end of every period you are inside. The left edge is
 * the first placement, for the reason `earliestPlacement` gives.
 *
 * A custom range whose end is in the future keeps it. That span is the one the
 * user drew, and the honest reading of "four marks in a 60-day window I chose"
 * is one every fifteen days even if half the window hasn't happened yet.
 * Silently clamping to today would print a rate for a period different from the
 * one the picker says is selected.
 *
 * `from` never passes `to`: a reversed custom range is already normalised by
 * `resolveBounds`, but an open range on a machine whose clock is behind the
 * data can still produce one, and a negative span would make every position in
 * the plot negative.
 */
export function habitWindow(
  bounds: Bounds,
  todayString: DayString,
  earliest: DayString | null,
): HabitWindow {
  const to = bounds.to ?? todayString;
  const requested = bounds.from ?? earliest ?? to;
  const from = requested > to ? to : requested;

  return { from, to, days: daysBetween(from, to) + 1 };
}

/** Does this day fall inside the closed window? */
function inWindow(day: DayString, window: HabitWindow): boolean {
  return day >= window.from && day <= window.to;
}

/** One habit, and everything the table says about it in one period. */
export type HabitRow = {
  activityId: string;
  name: string;
  mark: string;
  /** The area's ramp, carried on the sticker. The dot and the ticks share it. */
  colorKey: string;
  areaId: string;
  areaName: string;
  /** Placements in the window. Two on one Tuesday are two marks. */
  count: number;
  /** Days in the window carrying at least one mark. What the plot draws. */
  days: number;
  /**
   * Offsets from `window.from`, ascending, one per day with a mark.
   *
   * Offsets rather than day strings, because the only thing that reads them is
   * a plot that has to turn them into positions — and `offset / (days - 1)` is
   * that position with no date arithmetic in the component. The day it came
   * from is recoverable by adding the offset back, which nothing needs yet.
   */
  hits: number[];
  /** First and last day in the window it was placed, or null for an empty row. */
  first: DayString | null;
  last: DayString | null;
  /**
   * Days per mark across the window: the span divided by the count.
   *
   * Null under two marks, which is the one case where the number would be a
   * lie. One mark in a thirty-day window is not "every thirty days" — it is
   * once, and a rate implies a repetition that hasn't happened.
   *
   * **The span, not the observed stretch.** A habit done four times in the
   * first week of a year-long window comes out at about every 91 days, not
   * every 2. That is deliberate and it is what the rest of the row already
   * says: the count is in-range, the plot is in-range, and a frequency
   * measured over a different stretch than its neighbours would make the row
   * contradict itself. The column that tells you it stopped is the last one.
   *
   * The other candidate was the median gap between consecutive marks, which is
   * the better statistic for "how often do I do this when I'm doing it" and
   * would survive a dead tail. It answers a question the range picker isn't
   * asking, and it needs the reader to know what a median is to read a column
   * they came for at a glance.
   */
  interval: number | null;
};

/**
 * Every habit as a row, in library order.
 *
 * The third walk over the placement map, at the same grain as `activityTally`
 * and answering a wider question. The ranking says which habits you did most
 * and drops everything you didn't do; this is the whole tray with a period
 * measured against it, including the habits the period has nothing to say
 * about.
 *
 * **Which rows exist**, and it is `heatmap`'s rule rather than the ranking's. A
 * live sticker always gets a row, empty or not: "you have this habit and did
 * none of it this month" is a reading, and a tracker that hides it is only ever
 * showing you your wins. An *archived* sticker gets a row only if it was
 * actually placed inside the window — it isn't offered in the tray any more, so
 * an empty row for it is a question nobody asked, while a month you spent doing
 * it is still your month.
 *
 * **The area comes from the library, the name and colour from the placement.**
 * That split is `tally` and `activityTally`'s between them, and both halves are
 * deliberate: an area is a fact about the activity *now*, so re-filing a habit
 * moves its whole history with it, while the name is joined onto every
 * placement by `getStickersByDay`, so a rename arrives already applied. A row
 * built from the library for both would be the same answer; a row built from
 * the placement for both could not name an area at all.
 *
 * Marks whose activity has left the library entirely are dropped rather than
 * counted under an invented row — the deleted-and-not-yet-refetched window that
 * `Tally.unattributed` announces on the Areas tab.
 *
 * Library order, not sorted. Sorting is the table's own state and it belongs
 * with the control that sets it; see `sortHabits`, which is the other half of
 * this and is a separate function so that the expensive walk doesn't rerun
 * every time a header is clicked.
 */
export function habitTable(
  stickersByDay: StickersByDay,
  groups: LibraryGroup[],
  window: HabitWindow,
): HabitRow[] {
  const rows = new Map<string, HabitRow>();
  const archived = new Set<string>();
  /** Days already counted per habit, so `hits` holds one entry per day. */
  const seen = new Map<string, Set<DayString>>();

  for (const group of groups) {
    for (const sticker of group.stickers) {
      if (sticker.archived) archived.add(sticker.id);
      rows.set(sticker.id, {
        activityId: sticker.id,
        name: sticker.name,
        mark: sticker.mark,
        colorKey: sticker.colorKey,
        areaId: group.areaId,
        areaName: group.areaName,
        count: 0,
        days: 0,
        hits: [],
        first: null,
        last: null,
        interval: null,
      });
      seen.set(sticker.id, new Set());
    }
  }

  // Over the placements rather than over the window: the map holds only days
  // that have something on them, so this is one pass over what exists instead
  // of one lookup per habit per day. Same shape as `heatmap`.
  for (const [day, stickers] of stickersByDay) {
    if (!inWindow(day, window)) continue;

    for (const sticker of stickers.activities) {
      // The activity, never the placement `id`. Two placements of one sticker
      // are two marks with two ids and one `activityId`, and getting this wrong
      // produces a table of ones.
      const row = rows.get(sticker.activityId);
      if (!row) continue;

      row.count++;
      if (!row.first || day < row.first) row.first = day;
      if (!row.last || day > row.last) row.last = day;

      const days = seen.get(sticker.activityId)!;
      if (!days.has(day)) {
        days.add(day);
        row.days++;
        row.hits.push(daysBetween(window.from, day));
      }
    }
  }

  const table: HabitRow[] = [];
  for (const row of rows.values()) {
    if (row.count === 0 && archived.has(row.activityId)) continue;
    // The map is walked in insertion order and the placements arrive in
    // whatever order the day map yields, so this is the one place the plot's
    // left-to-right order is established.
    row.hits.sort((a, b) => a - b);
    row.interval = row.count >= 2 ? window.days / row.count : null;
    table.push(row);
  }

  return table;
}

/**
 * How the frequency column reads, or null when there is no rate to state.
 *
 * In the library rather than the component because every branch here is a
 * judgement about what a number means, and those are the ones worth a test.
 * What it is *not* is the dash: a column with nothing in it is the table's
 * business, and `AreaTable` already draws that decision for the same reason.
 *
 * "About", always, because it is a span over a count and not a schedule. A
 * habit done eight times in a month is about every four days whether you did it
 * on the 1st, 5th, 9th and 13th or four times in one week.
 *
 * Days all the way up, never weeks or months. "About every 21 days" beside
 * "about every 3 days" is two numbers in one unit that you can read against
 * each other at a glance; "about every 3 weeks" beside "about every 3 days" is
 * two numbers that look the same and aren't.
 */
export function frequencyLabel(row: HabitRow): string | null {
  if (row.count === 0) return null;
  if (row.count === 1 || row.interval === null) return "Once";

  const every = Math.round(row.interval);
  // Anything under a day and a half rounds to one, and "about every 1 days" is
  // not a sentence. A habit done more than once a day lands here too, which is
  // the right answer — daily is the most a calendar of days can say.
  if (every <= 1) return "About daily";
  return `About every ${every} days`;
}

/**
 * Which column the table is ordered by.
 *
 * No `name` here, and that is the one column whose header does not sort. The
 * habit is what every other cell in the row is *about* — it is the row's
 * label, the way `AreaTable`'s area is a `<th scope="row">` — and a table you
 * can only find a habit in by alphabetising it is a table you should have been
 * able to read anyway. Library order is also not arbitrary: the tray groups by
 * life area, so the unsorted table arrives in colour bands.
 *
 * `first` is the plot column. A strip of ticks has no single value to sort on,
 * so the header sorts by the day the ticks begin — which is the fact the
 * drawing shows that no other column states: whether this is a habit you have
 * been at all period or one that started last week.
 */
export type HabitSortKey = "area" | "count" | "interval" | "first" | "last";

export type SortDirection = "asc" | "desc";

/**
 * Where each column starts when you first click it.
 *
 * The useful end of each one, rather than ascending everywhere. Clicking
 * "Marks" to see your smallest counts is a second click away; clicking it to
 * see your biggest is the reason you clicked. Frequency ascends because the
 * smallest interval is the most-done habit, which is the same intent pointed at
 * a number that runs the other way — and getting that wrong is why this is a
 * table rather than six guesses at a call site.
 */
export const SORT_START: Record<HabitSortKey, SortDirection> = {
  area: "asc",
  count: "desc",
  interval: "asc",
  first: "asc",
  last: "desc",
};

/**
 * The rows in order, as a copy.
 *
 * A copy because `habitTable`'s output is memoized upstream and shared with
 * the filter and the pager; sorting in place would reorder an array other
 * things are holding and produce a table that changes when you paginate it.
 *
 * **Empty rows sink, in both directions.** A habit with no marks has no
 * frequency, no first day and no last day, and there is no honest place for it
 * in an ordering of those — ascending by "last done" would otherwise open the
 * table with a column of dashes. So the nulls go to the bottom whichever way
 * the arrow points, and the arrow orders the rows that have something to say.
 *
 * Name breaks every tie, which is the stability rule Step 12 wrote down: two
 * equal counts that come out in a different order on different renders is how a
 * reader stops trusting a panel. Alphabetical is arbitrary, but it is the same
 * arbitrary every time.
 */
export function sortHabits(
  rows: HabitRow[],
  key: HabitSortKey,
  direction: SortDirection,
): HabitRow[] {
  const sign = direction === "asc" ? 1 : -1;

  return [...rows].sort((a, b) => {
    const empty = emptyRank(a, key) - emptyRank(b, key);
    if (empty !== 0) return empty;

    const by = compare(a, b, key) * sign;
    return by !== 0 ? by : a.name.localeCompare(b.name);
  });
}

/** 1 for a row with nothing to sort on under this key, 0 otherwise. */
function emptyRank(row: HabitRow, key: HabitSortKey): number {
  switch (key) {
    case "interval":
      return row.count === 0 ? 1 : 0;
    case "first":
    case "last":
      return row[key] === null ? 1 : 0;
    case "area":
    case "count":
      return 0;
  }
}

function compare(a: HabitRow, b: HabitRow, key: HabitSortKey): number {
  switch (key) {
    case "area":
      return a.areaName.localeCompare(b.areaName);
    case "count":
      return a.count - b.count;
    case "interval":
      // A habit with one mark has no interval and is not empty either — it
      // sorts as the rarest thing there is, which is what one mark in a period
      // means next to a rate.
      return intervalOf(a) - intervalOf(b);
    case "first":
    case "last": {
      const left = a[key] ?? "";
      const right = b[key] ?? "";
      // Day strings compare as dates, which is the whole point of the format:
      // zero-padded and big-endian sorts lexicographically as it sorts
      // chronologically. See `inBounds` for the long version.
      return left < right ? -1 : left > right ? 1 : 0;
    }
  }
}

/** `Infinity` for a single mark: no rate, and rarer than any real one. */
function intervalOf(row: HabitRow): number {
  return row.interval ?? Number.POSITIVE_INFINITY;
}

/**
 * How many habits a page holds.
 *
 * Ten rows is about a laptop screen with the two panels above it, and it is a
 * number rather than a measurement on purpose: a table that pages at whatever
 * height the window happens to be changes how much it shows when you resize,
 * and every page then holds a different amount of what you were comparing.
 */
export const HABITS_PER_PAGE = 10;

/** Pages needed for `total` rows. Always at least one, so an empty table still
 *  has a page 1 to be on rather than a pager that says "0 of 0". */
export function pageCount(total: number, size = HABITS_PER_PAGE): number {
  return Math.max(1, Math.ceil(total / size));
}

/**
 * One page of rows, with the page number clamped rather than trusted.
 *
 * Filtering to one area while on page 3 leaves the page number past the end,
 * and the honest answer is the last page rather than an empty table — the rows
 * are still there, you just aren't looking at them. Clamping here rather than
 * resetting the state to 1 keeps the "page" concept in one place, and nothing
 * has to remember to correct itself in an effect.
 */
export function pageOf<T>(
  rows: T[],
  page: number,
  size = HABITS_PER_PAGE,
): T[] {
  const last = pageCount(rows.length, size);
  const current = Math.min(Math.max(page, 1), last);
  const start = (current - 1) * size;
  return rows.slice(start, start + size);
}
