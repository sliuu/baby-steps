// Value import relative with extension, for `node --test`; types keep `@/`.
import { addDays, daysBetween, startOfWeek } from "./daymath.ts";
import type { Bounds } from "@/lib/analytics";
import type { DayString } from "@/lib/dates";
import type { LibraryGroup } from "@/lib/queries/activities";
import type { StickersByDay } from "@/lib/stickers";

/** `Bounds` closed into real days; `days` (inclusive) is every rate's denominator. */
export type HabitWindow = { from: DayString; to: DayString; days: number };

/** First day with a placement (mood/note-only days don't count), or null. */
export function earliestPlacement(stickersByDay: StickersByDay): DayString | null {
  let earliest: DayString | null = null;

  for (const [day, stickers] of stickersByDay) {
    if (stickers.activities.length === 0) continue;
    if (!earliest || day < earliest) earliest = day;
  }

  return earliest;
}

/**
 * Open edges close to today and the first placement. Future custom ends are
 * kept (the user drew them). `from` is clamped so the span is never negative.
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

function inWindow(day: DayString, window: HabitWindow): boolean {
  return day >= window.from && day <= window.to;
}

/** A marked day, as an offset from `window.from`. */
export type HabitHit = { offset: number; count: number };

export type HabitRow = {
  activityId: string;
  name: string;
  mark: string;
  /** The category's ramp; dot and ticks share it. */
  colorKey: string;
  categoryId: string;
  categoryName: string;
  /** Placements in the window; two on one day are two. */
  count: number;
  /** Days with at least one mark. */
  days: number;
  /** Marked days, ascending, with per-day counts (shading needs "twice on Tuesday"). */
  hits: HabitHit[];
  /** First and last placement in the window; null if empty. */
  first: DayString | null;
  last: DayString | null;
  /** Window span / count (not the observed stretch); null under two marks. */
  interval: number | null;
};

/**
 * Every habit as a row, library order. Live stickers always get a row; archived
 * only if placed in the window. Category from the library, name and colour from
 * the placement. Orphaned marks are dropped. Sorting is `sortHabits`.
 */
export function habitTable(
  stickersByDay: StickersByDay,
  groups: LibraryGroup[],
  window: HabitWindow,
): HabitRow[] {
  const rows = new Map<string, HabitRow>();
  const archived = new Set<string>();
  /** Per-habit day → hit, so a second mark on a day bumps the same entry. */
  const seen = new Map<string, Map<DayString, HabitHit>>();

  for (const group of groups) {
    for (const sticker of group.stickers) {
      if (sticker.archived) archived.add(sticker.id);
      rows.set(sticker.id, {
        activityId: sticker.id,
        name: sticker.name,
        mark: sticker.mark,
        colorKey: sticker.colorKey,
        categoryId: group.categoryId,
        categoryName: group.categoryName,
        count: 0,
        days: 0,
        hits: [],
        first: null,
        last: null,
        interval: null,
      });
      seen.set(sticker.id, new Map());
    }
  }

  // One pass over existing days, not a lookup per habit per day.
  for (const [day, stickers] of stickersByDay) {
    if (!inWindow(day, window)) continue;

    for (const sticker of stickers.activities) {
      // `activityId`, never the placement `id`.
      const row = rows.get(sticker.activityId);
      if (!row) continue;

      row.count++;
      if (!row.first || day < row.first) row.first = day;
      if (!row.last || day > row.last) row.last = day;

      const days = seen.get(sticker.activityId)!;
      const already = days.get(day);
      if (already) {
        already.count++;
      } else {
        const hit: HabitHit = { offset: daysBetween(window.from, day), count: 1 };
        days.set(day, hit);
        row.days++;
        row.hits.push(hit);
      }
    }
  }

  const table: HabitRow[] = [];
  for (const row of rows.values()) {
    if (row.count === 0 && archived.has(row.activityId)) continue;
    // Placements arrive unordered; sort once here.
    row.hits.sort((a, b) => a.offset - b.offset);
    row.interval = row.count >= 2 ? window.days / row.count : null;
    table.push(row);
  }

  return table;
}

/** Frequency text, or null. "About", always in days so rows compare. */
export function frequencyLabel(row: HabitRow): string | null {
  if (row.count === 0) return null;
  if (row.count === 1 || row.interval === null) return "Once";

  const every = Math.round(row.interval);
  // Under 1.5 days (or several a day) rounds to daily.
  if (every <= 1) return "About daily";
  return `About every ${every} days`;
}

/** Sortable columns. Name (the row's label) and the plot don't sort. */
export type HabitSortKey = "category" | "count" | "interval" | "last";

export type SortDirection = "asc" | "desc";

/** First-click direction: the useful end of each column. */
export const SORT_START: Record<HabitSortKey, SortDirection> = {
  category: "asc",
  count: "desc",
  interval: "asc",
  last: "desc",
};

/**
 * Sorted copy (input is memoized and shared). Empty rows sink both ways;
 * name breaks ties for stable order.
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

/** 1 when the row has nothing to sort on for this key. */
function emptyRank(row: HabitRow, key: HabitSortKey): number {
  switch (key) {
    case "interval":
      return row.count === 0 ? 1 : 0;
    case "last":
      return row.last === null ? 1 : 0;
    case "category":
    case "count":
      return 0;
  }
}

function compare(a: HabitRow, b: HabitRow, key: HabitSortKey): number {
  switch (key) {
    case "category":
      return a.categoryName.localeCompare(b.categoryName);
    case "count":
      return a.count - b.count;
    case "interval":
      // One mark sorts as rarest (Infinity).
      return intervalOf(a) - intervalOf(b);
    case "last": {
      const left = a.last ?? "";
      const right = b.last ?? "";
      // Day strings sort chronologically.
      return left < right ? -1 : left > right ? 1 : 0;
    }
  }
}

/** `Infinity` for a single mark: no rate, and rarer than any real one. */
function intervalOf(row: HabitRow): number {
  return row.interval ?? Number.POSITIVE_INFINITY;
}

/** Fixed, not measured, so resizing doesn't change what a page holds. */
export const HABITS_PER_PAGE = 10;

/** At least one, so an empty table is "page 1", not "0 of 0". */
export function pageCount(total: number, size = HABITS_PER_PAGE): number {
  return Math.max(1, Math.ceil(total / size));
}

/** One page; the page number is clamped (e.g. after filtering), not trusted. */
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

/** Plot block size; scales with the window so it stays readable. */
export type PlotGrain = "day" | "week" | "month" | "year";

// Grain cutoffs (window days): day ≤31, week ≤366, month ≤5y, else year.
const DAY_MAX = 31;
const WEEK_MAX = 366;
const MONTH_MAX = 1827;

export function plotGrain(days: number): PlotGrain {
  if (days <= DAY_MAX) return "day";
  if (days <= WEEK_MAX) return "week";
  if (days <= MONTH_MAX) return "month";
  return "year";
}

/** A plot block. `days` is clipped to the window, so edge shading stays honest. */
export type PlotBlock = {
  from: DayString;
  to: DayString;
  /** Days covered, clipped to the window. */
  days: number;
  /** Placements inside it. */
  marks: number;
};

/**
 * Window cut on calendar boundaries (Sundays, 1sts), so blocks hold still as
 * the range moves. One forward walk: hits and blocks are both ascending.
 */
export function plotBlocks(window: HabitWindow, hits: HabitHit[]): PlotBlock[] {
  const grain = plotGrain(window.days);
  const blocks: PlotBlock[] = [];

  let cursor = window.from;
  while (cursor <= window.to) {
    const next = nextBoundary(cursor, grain);
    const to = next > window.to ? window.to : addDays(next, -1);
    blocks.push({
      from: cursor,
      to,
      days: daysBetween(cursor, to) + 1,
      marks: 0,
    });
    cursor = next;
  }

  let index = 0;
  for (const hit of hits) {
    const day = addDays(window.from, hit.offset);
    while (index < blocks.length - 1 && day > blocks[index].to) index++;
    const block = blocks[index];
    if (block && day >= block.from && day <= block.to) block.marks += hit.count;
  }

  return blocks;
}

/** Start of the next block. String math for month/year: no `Date`, no timezone. */
function nextBoundary(day: DayString, grain: PlotGrain): DayString {
  switch (grain) {
    case "day":
      return addDays(day, 1);
    // From the containing Sunday, so later blocks start on Sundays.
    case "week":
      return addDays(startOfWeek(day), 7);
    case "month": {
      const year = Number(day.slice(0, 4));
      const month = Number(day.slice(5, 7));
      return month === 12
        ? `${year + 1}-01-01`
        : `${year}-${String(month + 1).padStart(2, "0")}-01`;
    }
    case "year":
      return `${Number(day.slice(0, 4)) + 1}-01-01`;
  }
}

/**
 * 0 empty, 1 some, 2 heavy (marks ≥ half the days, min 2). Absolute, not
 * per-row, so rows compare.
 */
export function blockLevel(block: PlotBlock): 0 | 1 | 2 {
  if (block.marks <= 0) return 0;
  return block.marks >= Math.max(2, block.days / 2) ? 2 : 1;
}
