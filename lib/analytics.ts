// Relative value imports with extensions so `node --test` runs this.
import { addDays, daysBetween, startOfWeek } from "./daymath.ts";
import { MOODS, MOOD_LABEL, type Mood } from "./moods.ts";
import type { DayString } from "@/lib/dates";
import type { LibraryGroup } from "@/lib/queries/activities";
import type { StickersByDay } from "@/lib/stickers";

/**
 * A Trends range as a rule, resolved against today by `resolveBounds`.
 * Two families: to-date (this week/month/year) and trailing (last N days).
 */
export type Range =
  | { kind: "week" }
  | { kind: "days7" }
  | { kind: "month" }
  | { kind: "days30" }
  | { kind: "year" }
  | { kind: "days365" }
  | { kind: "all" }
  /** Either edge may be missing mid-entry. */
  | { kind: "custom"; from: DayString | null; to: DayString | null };

export type RangeKind = Range["kind"];

/** Dropdown labels. Trailing ones count days ("Last 30 days", not "Last month"). */
export const RANGE_LABEL: Record<RangeKind, string> = {
  week: "This week",
  days7: "Last 7 days",
  month: "This month",
  days30: "Last 30 days",
  year: "This year",
  days365: "Last 12 months",
  all: "All time",
  custom: "Custom",
};

/** Dropdown order: zoom out, each to-date range above its trailing twin. */
export const RANGE_KINDS: RangeKind[] = [
  "week",
  "days7",
  "month",
  "days30",
  "year",
  "days365",
  "all",
  "custom",
];

/** Inclusive edges; `null` = unbounded on that side. */
export type Bounds = { from: DayString | null; to: DayString | null };

/**
 * Range + today → day strings by string surgery; no `Date`, no timezone.
 * `today` is passed in so server and browser agree. "This year" is to date.
 */
export function resolveBounds(range: Range, today: DayString, weekStartsOn: 0 | 1 = 0): Bounds {
  switch (range.kind) {
    case "week":
      return { from: startOfWeek(today, weekStartsOn), to: today };
    // Includes today, so 7 days starts 6 back.
    case "days7":
      return { from: addDays(today, -6), to: today };
    case "month":
      return { from: `${today.slice(0, 7)}-01`, to: today };
    case "days30":
      return { from: addDays(today, -29), to: today };
    case "year":
      return { from: `${today.slice(0, 4)}-01-01`, to: today };
    // 365, not "this day last year" (366 across a leap day).
    case "days365":
      return { from: addDays(today, -364), to: today };
    case "all":
      return { from: null, to: null };
    case "custom":
      return normalizeBounds(range.from, range.to);
  }
}

/** Swap reversed custom edges; a backwards pick still means that span. */
function normalizeBounds(
  from: DayString | null,
  to: DayString | null,
): Bounds {
  if (from && to && from > to) return { from: to, to: from };
  return { from, to };
}

/** String compare works: zero-padded big-endian dates sort chronologically. */
export function inBounds(day: DayString, bounds: Bounds): boolean {
  if (bounds.from && day < bounds.from) return false;
  if (bounds.to && day > bounds.to) return false;
  return true;
}

export type CategoryTally = {
  categoryId: string;
  categoryName: string;
  colorKey: string;
  /** One sticker on one day is one mark. */
  count: number;
  /** Exact; 0 when nothing is in range. */
  share: number;
  /** One decimal place. See `percent`. */
  percent: number;
};

export type Tally = {
  /** Every category, in user order, empty ones included. */
  categories: CategoryTally[];
  total: number;
  /**
   * Marks whose activity isn't in the library (archived still counts). Nonzero
   * only between a delete and the refetch.
   */
  unattributed: number;
};

/**
 * Counts per category within `bounds`, client-side (data is already loaded).
 * Category comes from the library now, so reclassifying moves the history.
 */
export function tally(
  stickersByDay: StickersByDay,
  groups: LibraryGroup[],
  bounds: Bounds,
): Tally {
  const categoryOf = new Map<string, string>();
  for (const group of groups) {
    for (const sticker of group.stickers) categoryOf.set(sticker.id, group.categoryId);
  }

  const counts = new Map<string, number>();
  let total = 0;
  let unattributed = 0;

  for (const [day, stickers] of stickersByDay) {
    if (!inBounds(day, bounds)) continue;

    for (const sticker of stickers.activities) {
      // By activity, never placement `id`.
      const categoryId = categoryOf.get(sticker.activityId);
      total++;
      if (!categoryId) {
        unattributed++;
        continue;
      }
      counts.set(categoryId, (counts.get(categoryId) ?? 0) + 1);
    }
  }

  const ordered = groups.map((group) => counts.get(group.categoryId) ?? 0);

  return {
    categories: groups.map((group, i) => ({
      categoryId: group.categoryId,
      categoryName: group.categoryName,
      colorKey: group.colorKey,
      count: ordered[i],
      share: total === 0 ? 0 : ordered[i] / total,
      percent: percent(ordered[i], total),
    })),
    total,
    unattributed,
  };
}

/**
 * Percent to one decimal, each row rounded on its own. Largest-remainder was
 * dropped: it gave equal counts unequal shares. Sums may drift by a tenth.
 */
export function percent(count: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((count / total) * 1000) / 10;
}

export type ActivityTally = {
  activityId: string;
  name: string;
  mark: string;
  colorKey: string;
  count: number;
  /** `count / total`, exact. */
  share: number;
  /** One decimal place. See `percent`. */
  percent: number;
};

export type ActivityRanking = {
  /** Only habits with marks in range, biggest first. */
  activities: ActivityTally[];
  /** Same as `tally`'s total. */
  total: number;
};

/**
 * Habits ranked by marks in range. No library needed: name/mark/colour are on
 * the placement. No zero rows. Ties break by name for stable order.
 */
export function activityTally(
  stickersByDay: StickersByDay,
  bounds: Bounds,
): ActivityRanking {
  const counts = new Map<string, ActivityTally>();
  let total = 0;

  for (const [day, stickers] of stickersByDay) {
    if (!inBounds(day, bounds)) continue;

    for (const sticker of stickers.activities) {
      total++;
      // By activity, never placement `id`.
      const seen = counts.get(sticker.activityId);
      if (seen) {
        seen.count++;
        continue;
      }
      counts.set(sticker.activityId, {
        activityId: sticker.activityId,
        name: sticker.name,
        mark: sticker.mark,
        colorKey: sticker.colorKey,
        count: 1,
        share: 0,
        percent: 0,
      });
    }
  }

  const activities = [...counts.values()]
    .map((activity) => ({
      ...activity,
      share: total === 0 ? 0 : activity.count / total,
      percent: percent(activity.count, total),
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  return { activities, total };
}

export type MoodCount = {
  mood: Mood;
  /** From `MOOD_LABEL`, so it can't drift. */
  label: string;
  count: number;
};

export type MoodTally = {
  /** All five, picker order, zeros kept: the order is the data. */
  moods: MoodCount[];
  /** Days with any mood, not days in range. */
  total: number;
};

/** Days per mood in range. Separate from `tally`: it counts days, not placements. */
export function moodTally(
  stickersByDay: StickersByDay,
  bounds: Bounds,
): MoodTally {
  const counts = new Map<Mood, number>();
  let total = 0;

  for (const [day, stickers] of stickersByDay) {
    if (!inBounds(day, bounds)) continue;
    if (!stickers.mood) continue;

    counts.set(stickers.mood, (counts.get(stickers.mood) ?? 0) + 1);
    total++;
  }

  return {
    moods: MOODS.map((mood) => ({
      mood,
      label: MOOD_LABEL[mood],
      count: counts.get(mood) ?? 0,
    })),
    total,
  };
}

/**
 * Mood height, 5 (great) to 1 (rough). Ordinal, so only direction is
 * meaningful; never print the value. Test checks it matches `MOODS` order.
 */
export const MOOD_SCORE: Record<Mood, number> = {
  great: 5,
  good: 4,
  okay: 3,
  low: 2,
  rough: 1,
};

/** Gaps longer than this (days) break the line rather than invent data. */
const MOOD_GAP = 7;

/** Min logged days (3 a side) and min shift (half a rung) to claim a drift. */
const DRIFT_MIN = 6;
const DRIFT_STEP = 0.5;

export type MoodPoint = {
  day: DayString;
  mood: Mood;
  /** From `MOOD_LABEL`, so tooltip and strip agree. */
  label: string;
  /** 5 at the top, 1 at the bottom. */
  score: number;
  /** 0–1 by date across the logged span (not index, not pixels). */
  at: number;
  /** Run broke before this point; see `MOOD_GAP`. */
  gap: boolean;
};

export type MoodSeries = {
  /** Logged days only, oldest first; an unrated day is no data. */
  points: MoodPoint[];
  /** First and last logged day (the `at` span), not the range's edges. */
  from: DayString | null;
  to: DayString | null;
};

/**
 * Mood per logged day over the picked range. No smoothing on purpose: a mean
 * would draw heights that aren't moods.
 */
export function moodSeries(
  stickersByDay: StickersByDay,
  bounds: Bounds,
): MoodSeries {
  const logged: { day: DayString; mood: Mood }[] = [];

  for (const [day, stickers] of stickersByDay) {
    if (!inBounds(day, bounds)) continue;
    if (!stickers.mood) continue;
    logged.push({ day, mood: stickers.mood });
  }

  // Load-bearing: Map order is query order, and everything below reads neighbours.
  logged.sort((a, b) => a.day.localeCompare(b.day));

  if (logged.length === 0) return { points: [], from: null, to: null };

  const from = logged[0].day;
  const to = logged[logged.length - 1].day;
  const span = daysBetween(from, to);

  const points = logged.map((entry, i) => ({
    day: entry.day,
    mood: entry.mood,
    label: MOOD_LABEL[entry.mood],
    score: MOOD_SCORE[entry.mood],
    // One logged day: centre it (and avoid 0/0).
    at: span === 0 ? 0.5 : daysBetween(from, entry.day) / span,
    gap: i > 0 && daysBetween(logged[i - 1].day, entry.day) > MOOD_GAP,
  }));

  return { points, from, to };
}

/** Null when too short to say. */
export type MoodDrift = "up" | "down" | "steady";

/**
 * Mean of first half vs last half (odd middle dropped). Not endpoints, not a
 * regression. Null under `DRIFT_MIN` points.
 */
export function moodDrift(series: MoodSeries): MoodDrift | null {
  const n = series.points.length;
  if (n < DRIFT_MIN) return null;

  const half = Math.floor(n / 2);
  const first = mean(series.points.slice(0, half).map((p) => p.score));
  const last = mean(series.points.slice(n - half).map((p) => p.score));
  const moved = last - first;

  if (Math.abs(moved) < DRIFT_STEP) return "steady";
  return moved > 0 ? "up" : "down";
}

/** Callers never pass an empty slice. */
function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** The mood chart in words (it's aria-hidden). No scores. Null when empty. */
export function moodTakeaway(series: MoodSeries, phrase: string): string | null {
  const n = series.points.length;
  if (n === 0) return null;

  const days = `${n} logged day${n === 1 ? "" : "s"}`;
  const drift = moodDrift(series);

  // Under six points, say so rather than guess.
  if (!drift) {
    return `${days} ${phrase} — not enough yet to call a direction.`;
  }

  switch (drift) {
    case "up":
      return `Your mood has been climbing ${phrase}, across ${days}.`;
    case "down":
      return `Your mood has been dipping ${phrase}, across ${days}.`;
    case "steady":
      return `Your mood has held steady ${phrase}, across ${days}.`;
  }
}

/**
 * All categories tied at the top, library order; ties are not broken.
 * Empty when nothing has marks (guards `Math.max()` of nothing).
 */
export function leaders(tally: Tally): CategoryTally[] {
  if (tally.categories.length === 0) return [];

  const top = Math.max(...tally.categories.map((category) => category.count));
  if (top === 0) return [];

  return tally.categories.filter((category) => category.count === top);
}

/** Range as an adverbial for sentences (not `RANGE_LABEL`). */
export function rangePhrase(range: Range): string {
  switch (range.kind) {
    case "week":
      return "this week";
    case "days7":
      return "in the last 7 days";
    case "month":
      return "this month";
    case "days30":
      return "in the last 30 days";
    case "year":
      return "this year";
    case "days365":
      return "in the last 12 months";
    case "all":
      return "so far";
    case "custom":
      return "in this range";
  }
}

/**
 * The category chart in words (screen readers get this first). One leader,
 * 2–3 tied named, 4+ counted, all tied = "spread evenly". Null when empty.
 */
export function takeaway(tally: Tally, phrase: string): string | null {
  const top = leaders(tally);
  if (top.length === 0) return null;

  const names = top.map((category) => category.categoryName);
  const everyCategory = top.length === tally.categories.length && tally.categories.length > 1;

  if (everyCategory) {
    return `Your attention was spread evenly across every category ${phrase}.`;
  }
  if (names.length === 1) {
    return `${names[0]} held the greatest share of your attention ${phrase}.`;
  }
  if (names.length <= 3) {
    return `${listNames(names)} tied for the greatest share of your attention ${phrase}.`;
  }
  return `${names.length} categories tied for the greatest share of your attention ${phrase}.`;
}

/** "A", "A and B", "A, B and C" (no serial comma; max three). */
function listNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
