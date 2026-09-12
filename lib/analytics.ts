// Every value import here is relative with its extension. `lib/analytics.test.ts`
// runs this module under `node --test`, where nothing resolves `@/` — that alias
// belongs to the bundler. The type imports below are erased and cross freely,
// which is why they can keep the alias.
//
// `./moods.ts` and `./daymath.ts` are the only value imports, and both are safe
// to take because neither imports anything itself. A module with no imports can
// always be pulled into a tested one; the rule that bites is depth, not count.
import { daysBetween } from "./daymath.ts";
import { MOODS, MOOD_LABEL, type Mood } from "./moods.ts";
import type { DayString } from "@/lib/dates";
import type { LibraryGroup } from "@/lib/queries/activities";
import type { StickersByDay } from "@/lib/stickers";

/**
 * Which stretch of time the Trends page is reading.
 *
 * Three of the four carry no dates at all, because they don't have fixed ones —
 * "this month" is a different fortnight in September than it is today. They name
 * a *rule*, and `resolveBounds` turns the rule plus a date into real edges. The
 * alternative — storing `{from, to}` the moment a range is picked — is a tab
 * left open overnight still reporting on yesterday's month.
 */
export type Range =
  | { kind: "month" }
  | { kind: "year" }
  | { kind: "all" }
  /** Either edge may be missing while you're still filling the other one in. */
  | { kind: "custom"; from: DayString | null; to: DayString | null };

export type RangeKind = Range["kind"];

/** What the dropdown says. Also the caption's fallback for the fixed ranges. */
export const RANGE_LABEL: Record<RangeKind, string> = {
  month: "This month",
  year: "This year",
  all: "All time",
  custom: "Custom",
};

export const RANGE_KINDS: RangeKind[] = ["month", "year", "all", "custom"];

/**
 * Two inclusive edges, either of which may be open.
 *
 * `null` means unbounded on that side rather than "no rows" — "all time" is
 * `{from: null, to: null}`, and a custom range with only a start is everything
 * from that day onward.
 */
export type Bounds = { from: DayString | null; to: DayString | null };

/**
 * A range plus a date becomes two day strings, with no `Date` object anywhere.
 *
 * This is the payoff for Step 5's decision to keep days as `"2026-08-12"`
 * strings. The format is zero-padded and big-endian, so the first of a month is
 * that month's prefix plus `-01` and the first of a year is its prefix plus
 * `-01-01` — string surgery, not calendar arithmetic. Nothing here can be off by
 * a day in a timezone, because nothing here knows what a timezone is.
 *
 * `today` is passed in rather than read from the clock, for the same reason
 * `monthGrid` takes it: a function that reads the clock gives a different answer
 * on the server than in the browser, and it can't be tested without freezing
 * time.
 *
 * "This year" is the calendar year *to date* — 1 January through today, not a
 * trailing twelve months. It matches what the words say, and it matches how
 * "this month" already behaves: both are the period you are currently inside.
 */
export function resolveBounds(range: Range, today: DayString): Bounds {
  switch (range.kind) {
    case "month":
      return { from: `${today.slice(0, 7)}-01`, to: today };
    case "year":
      return { from: `${today.slice(0, 4)}-01-01`, to: today };
    case "all":
      return { from: null, to: null };
    case "custom":
      return normalizeBounds(range.from, range.to);
  }
}

/**
 * Custom edges, put in order.
 *
 * Someone picking an end date before the start date means the range they drew,
 * not an empty one — every day between two clicks. The picker can hand them over
 * either way round and this is the one place that decides.
 */
function normalizeBounds(
  from: DayString | null,
  to: DayString | null,
): Bounds {
  if (from && to && from > to) return { from: to, to: from };
  return { from, to };
}

/**
 * Does this day fall inside?
 *
 * `>=` and `<=` on strings, which is the whole trick: `"2026-08-09" < "2026-08-10"`
 * is true for the same reason `"a" < "b"` is, because a zero-padded big-endian
 * date sorts lexicographically exactly as it sorts chronologically. Parsing
 * either side into a `Date` to compare them would be slower, and would hand the
 * comparison a timezone it has no business having.
 */
export function inBounds(day: DayString, bounds: Bounds): boolean {
  if (bounds.from && day < bounds.from) return false;
  if (bounds.to && day > bounds.to) return false;
  return true;
}

export type AreaTally = {
  areaId: string;
  areaName: string;
  colorKey: string;
  /** Placements in range — one sticker on one day is one mark. */
  count: number;
  /** `count / total`, exact. 0 when nothing is in range. */
  share: number;
  /** `share` as a percentage to one decimal place. See `percent`. */
  percent: number;
};

export type Tally = {
  /** Every area the user has, in their own order — including empty ones. */
  areas: AreaTally[];
  total: number;
  /**
   * Marks in range whose activity isn't in the library any more.
   *
   * Still 0 in normal use, and archiving is the reason it stayed that way.
   * `getStickerLibrary` deliberately doesn't filter `archived` — the archived
   * stickers come back carrying the flag, and each list decides for itself
   * whether to draw them — so a retired sticker's past marks are still
   * attributable to an area and still counted here. Retiring a habit doesn't
   * rewrite the months you did it.
   *
   * What can land in this field is a mark whose activity was *deleted*, in the
   * window between the delete and the refetch. The row is gone from
   * `day_activities` by cascade, so the number settles at 0 again — but during
   * that window the total says so out loud instead of quietly shrinking. A
   * number nobody can see going wrong is the failure mode worth a field.
   */
  unattributed: number;
};

/**
 * Counts per life area, for the days inside `bounds`.
 *
 * Grouped in the browser, from data the page already has. That's the cheap and
 * correct choice at this size and not the general one: `getStickersByDay`
 * already ships every placement to the client for the calendar, so aggregating
 * here is one pass over an array that is already in memory, and switching range
 * is instant with no round trip. A `group by` in Postgres would be one request
 * per range change to re-derive numbers from rows we're already holding. The
 * point at which that flips is the point at which the calendar stops fetching
 * everything — a few thousand rows, per the note on `getStickersByDay` — and
 * both would move together.
 *
 * The area an activity belongs to comes from `groups`, not from the placement.
 * A `day_activities` row carries only which activity it is, and the activity's
 * area is a fact about the activity *now* — so moving a sticker to another life
 * area moves its whole history with it. That is the right behaviour for a habit
 * tracker (you reclassified the habit, not the days) and it's a deliberate
 * position rather than an accident of the join, because the alternative is
 * stamping an area onto every placement and never being able to correct it.
 */
export function tally(
  stickersByDay: StickersByDay,
  groups: LibraryGroup[],
  bounds: Bounds,
): Tally {
  // One pass over the library builds the lookup; without it, attributing each
  // placement would be a scan of every area's sticker list.
  const areaOf = new Map<string, string>();
  for (const group of groups) {
    for (const sticker of group.stickers) areaOf.set(sticker.id, group.areaId);
  }

  const counts = new Map<string, number>();
  let total = 0;
  let unattributed = 0;

  for (const [day, stickers] of stickersByDay) {
    if (!inBounds(day, bounds)) continue;

    for (const sticker of stickers.activities) {
      // The activity, never the placement. Two placements of one sticker are
      // two marks with two `id`s and one `activityId` — the same distinction
      // `dayMatches` turns on, and the same one that would silently produce
      // zeroes here if it were got wrong.
      const areaId = areaOf.get(sticker.activityId);
      total++;
      if (!areaId) {
        unattributed++;
        continue;
      }
      counts.set(areaId, (counts.get(areaId) ?? 0) + 1);
    }
  }

  const ordered = groups.map((group) => counts.get(group.areaId) ?? 0);

  return {
    areas: groups.map((group, i) => ({
      areaId: group.areaId,
      areaName: group.areaName,
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
 * One share, as a percentage to one decimal place.
 *
 * Each row rounded on its own, which is the second answer this function has
 * given and worth the note, because the first one was defensible and wrong.
 *
 * It used to apportion: floor every row, then hand the leftover points to the
 * rows that lost most in the flooring — largest-remainder, the method used to
 * turn votes into seats — so the column summed to exactly 100 by construction.
 * The reasoning was that a percentage column reading 99 is the kind of thing you
 * notice and then stop trusting the table.
 *
 * Real data killed it. Two areas at 11 marks each out of 63 came out as 18% and
 * 17%: identical counts, different shares, sitting on adjacent rows because the
 * table sorts by count. Apportionment has to break the tie *somehow* — there was
 * one leftover point and two equal claims on it — so it went to the earlier row.
 * That is arithmetically correct and reads as a bug, and it's the worse failure:
 * a column that sums to 99 makes you doubt the last digit, while two equal
 * counts with unequal shares makes you doubt the whole table. Equal in, equal
 * out is the stronger promise, and only independent rounding can keep it.
 *
 * The decimal place is what makes the trade cheap rather than free. Ties still
 * land on the same number (11/63 is 17.46% twice, so 17.5% twice), and the
 * column now drifts by a tenth or two instead of a whole point — small enough to
 * read as rounding. `AreaTable` prints the column's real sum in the total row so
 * that what's on screen always adds up to what's on screen.
 */
export function percent(count: number, total: number): number {
  if (total === 0) return 0;
  // Round at tenths, then bring the decimal point back. Doing it in that order
  // keeps the result a number the caller can add up, rather than a string.
  return Math.round((count / total) * 1000) / 10;
}

/** One habit and how often it was placed in range. */
export type ActivityTally = {
  activityId: string;
  name: string;
  mark: string;
  colorKey: string;
  count: number;
  /** `count / total`, exact. */
  share: number;
  /** `share` as a percentage to one decimal place. See `percent`. */
  percent: number;
};

export type ActivityRanking = {
  /** Only habits with at least one mark in range, biggest first. */
  activities: ActivityTally[];
  /** Marks in range. The same number `tally` reports. */
  total: number;
};

/**
 * Which habits you actually did, ranked.
 *
 * The other half of the question `tally` answers. `tally` rolls placements up
 * to the six life areas, which is the balance picture — this leaves them at the
 * grain you placed them at, which is the "what did I do most" one. Both walk
 * the same map for the same reason, and neither is derivable from the other.
 *
 * **No library argument, and that's the difference from `tally`.** An area is a
 * fact about an activity that a placement doesn't carry, so attributing a mark
 * to one needs the groups. A habit's own name, mark and colour *are* on the
 * placement — `getStickersByDay` joins them live, so a renamed sticker's whole
 * history comes back renamed — and asking the library for them again would be a
 * second source for the same fact.
 *
 * That also decides the empty rows: there are none. A habit you never did in
 * range simply isn't in a ranking of what you did. `tally` keeps its zero rows
 * because six areas are a fixed frame you read the month against; a list of
 * habits isn't a frame, and twenty rows of nothing above the four you did would
 * bury the answer.
 *
 * Ties break by name, not by whatever order the map happened to yield. Step 12
 * has the long version: two equal counts that come out in different places on
 * different renders is the kind of instability that makes a reader stop
 * trusting the panel. Alphabetical is arbitrary but it is at least the *same*
 * arbitrary every time.
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
      // The activity, never the placement `id` — see the same note in `tally`.
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

/** One mood and how many days in range carried it. */
export type MoodCount = {
  mood: Mood;
  /** The word the strip prints. From `MOOD_LABEL`, so it can't drift. */
  label: string;
  count: number;
};

export type MoodTally = {
  /**
   * All five, always, in the picker's order — never sorted, never filtered.
   *
   * The same rule the Life Star follows and for a stronger reason. The moods are
   * a fixed, ordered scale running great → rough, so their sequence *is* data:
   * a strip that reads 4, 9, 2, 1, 0 tells you the month leaned good at a
   * glance, and the same five numbers ranked biggest-first tell you nothing.
   * Dropping the zeroes would be worse still, because a gap in a scale is a
   * measurement — "no rough days" is one of the better things this strip can
   * say.
   */
  moods: MoodCount[];
  /** Days in range carrying any mood. Not days in range. */
  total: number;
};

/**
 * How the days in range felt.
 *
 * A second pass over the same map `tally` walks, deliberately not folded into
 * it. They answer different questions about different units — `tally` counts
 * *placements*, of which a day can hold many, and this counts *days*, of which
 * each holds at most one mood (a `UNIQUE` on `day_moods`, written into
 * `DayStickers.mood` as one value or null). Merging them would produce one
 * function returning two unrelated shapes, and every caller would take half.
 *
 * The cost is one extra walk over a map that's already in memory, which is the
 * same trade `tally` documents and the same size of nothing.
 */
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
 * A mood's height on the line: 5 for Great down to 1 for Rough.
 *
 * **This is the one real liberty the chart takes, so it is taken in the open.**
 * The five moods are an *ordinal* scale — they have an order and nothing else.
 * Nobody has measured that the step from Great to Good is the same size as the
 * step from Low to Rough, and it probably isn't. A line chart cannot be drawn
 * without asserting that they are, because a line needs a height and a height
 * is a number. So the assertion is made here, once, where it can be read,
 * rather than three levels down inside a component.
 *
 * What it costs: the *value* of the line is not meaningful. "3.4" is not a
 * mood and the chart never prints one. What it keeps is the only thing the
 * question needs — the *direction*, which survives any scale that preserves the
 * order. Up is better, down is worse, and that is all the picture claims.
 *
 * Written out rather than derived from `MOODS.length - index` so that reading
 * this file tells you the numbers. The test asserts it agrees with the array's
 * order, which is the half that would actually go wrong.
 */
export const MOOD_SCORE: Record<Mood, number> = {
  great: 5,
  good: 4,
  okay: 3,
  low: 2,
  rough: 1,
};

/**
 * A gap longer than this breaks the line instead of being drawn through.
 *
 * A straight segment between two points is a claim about what happened in
 * between. Across two or three days that claim is harmless and joining them is
 * what makes the series readable. Across three weeks it is an invention — the
 * line would slope smoothly through a fortnight you never logged and look
 * exactly like a fortnight you did.
 *
 * A week is the boundary because it is the unit the rest of the app already
 * thinks in, and because a whole week unlogged is the point at which the honest
 * answer stops being "roughly this" and starts being "no idea".
 */
const MOOD_GAP = 7;

/**
 * Logged days before a direction can be claimed, and how far it has to move.
 *
 * Six is three points a side, which is the fewest that can average to anything
 * but noise. Half a rung is the threshold because the scale's own resolution is
 * one rung: a shift of less than half a step is not your mood changing, it is
 * which days you happened to open the app on.
 */
const DRIFT_MIN = 6;
const DRIFT_STEP = 0.5;

/** One logged day, placed on the line. */
export type MoodPoint = {
  day: DayString;
  mood: Mood;
  /** The word, from `MOOD_LABEL`, so a tooltip can't drift from the strip. */
  label: string;
  /** `MOOD_SCORE[mood]`. 5 at the top of the chart, 1 at the bottom. */
  score: number;
  /**
   * Where the day sits along the span: 0 on the first logged day, 1 on the
   * last. A *fraction*, not a pixel — the component owns its own box, and a lib
   * that returned coordinates would have to be told how wide the card is.
   *
   * Positioned by date and not by index, which is the difference between a time
   * series and a list. Three days logged in a row and three logged a month
   * apart are not the same picture, and evenly spacing them would draw them
   * identically.
   */
  at: number;
  /** True when the run before this point ended — see `MOOD_GAP`. */
  gap: boolean;
};

export type MoodSeries = {
  /** Only days that carry a mood, oldest first. Never one entry per calendar
   *  day: a day you didn't rate is not a neutral day, it is no data. */
  points: MoodPoint[];
  /** The first and last logged day, which is the span `at` is measured across.
   *  Not the range's edges — a month with one mood in it on the 9th has a span
   *  of zero, and stretching that point across the month would invent 30 days
   *  of flat line. */
  from: DayString | null;
  to: DayString | null;
};

/**
 * How the mood went, day by day, over whatever range is picked.
 *
 * A third pass over the map `tally` and `moodTally` already walk, and the third
 * one is the least apologetic: `moodTally` counts how many days felt each way
 * and deliberately throws the dates away, which is exactly the axis this needs.
 * One function returning both would return a shape where every caller takes
 * half — the argument `moodTally` already makes about not folding into `tally`.
 *
 * It follows the range picker, unlike the habit strip. The strip ignores the
 * picker because a density picture needs a fixed recent span to be comparable
 * with itself; a line needs only enough points to have a direction, and a
 * fortnight of them is a real answer to "how has this fortnight gone".
 *
 * **No smoothing.** This drew a centred rolling mean for about an hour and it
 * was the wrong instrument. A mean is a claim *about* your days; the dots are
 * your days, and the line between them is the only thing that says "these two
 * are consecutive" without inventing a third number. Smoothing also quietly
 * moves the line off the dots it is drawn from, which on a five-rung scale
 * means the curve passes through heights that are not moods.
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

  // `StickersByDay` is a Map in insertion order, which is the query's order and
  // not necessarily the calendar's. Every number below — the span, the gaps,
  // the rolling mean — reads neighbours, so the sort is load-bearing rather
  // than cosmetic. Day strings are fixed-width and zero-padded, so lexical
  // order is chronological order.
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
    // A span of zero is one logged day, or several on the same day — which
    // cannot happen, since `day_moods` is unique per day, but the division
    // would be `0/0` either way. Centred, because a lone point pinned to the
    // left edge reads as the start of a line that failed to draw.
    at: span === 0 ? 0.5 : daysBetween(from, entry.day) / span,
    gap: i > 0 && daysBetween(logged[i - 1].day, entry.day) > MOOD_GAP,
  }));

  return { points, from, to };
}

/** Which way the series went, or null when it is too short to say. */
export type MoodDrift = "up" | "down" | "steady";

/**
 * Up, down or steady, by comparing the first half of the series to the last.
 *
 * Halves rather than "first point against last point", which would let one
 * rough Tuesday at either end decide the verdict. Halves rather than a fitted
 * slope, because a regression line over five ordinal values is arithmetic
 * dressed up as evidence — it would produce a number with three decimals from
 * data that has five possible values.
 *
 * An odd count drops its middle point rather than giving it to one side, so the
 * two halves are always the same size and the comparison is symmetric.
 *
 * Null under `DRIFT_MIN` points. "Steady" is a claim, and a claim needs enough
 * data to have been able to say otherwise — reporting three days as steady is
 * the same failure as reporting them as climbing.
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

/** Guarded by its only caller, which never passes an empty slice. */
function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * The line, in words. The mood tab's answer to `takeaway`.
 *
 * Same job and the same reason: the chart is `aria-hidden`, so this sentence is
 * what a screen reader gets, and it is generated from the series rather than
 * written once because a hand-written caption goes stale the moment the range
 * changes.
 *
 * It never prints a score. The numbers behind the line are a made-up scale (see
 * `MOOD_SCORE`) and putting "3.4" on the page would give them an authority they
 * haven't earned. The direction is the finding; the count of logged days is
 * what tells you how much to trust it.
 *
 * Null for an empty series — there is no sentence for no data, and `MoodStrip`
 * below already says the useful thing about that case.
 */
export function moodTakeaway(series: MoodSeries, phrase: string): string | null {
  const n = series.points.length;
  if (n === 0) return null;

  const days = `${n} logged day${n === 1 ? "" : "s"}`;
  const drift = moodDrift(series);

  // Named rather than a verdict. Under six points the honest answer is that the
  // question can't be answered yet, and saying so points at what would fix it.
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
 * The areas tied at the top, in library order.
 *
 * A list rather than one area, because ties are real and this app has already
 * been bitten by pretending otherwise. Step 12's percentage column tried to
 * break a tie between two areas at 11 marks and produced 18% and 17% for equal
 * counts; the fix was to stop breaking ties. Same shape here: picking `areas[0]`
 * after a sort would name Exercise and quietly not name Friends & Family, which
 * has exactly as good a claim. The sentence can say "tied" — but only if the
 * function that feeds it doesn't decide first.
 *
 * Empty when there is nothing to lead: no areas, no marks, or every area at
 * zero. `Math.max()` of nothing is `-Infinity`, which would otherwise sail
 * through the filter and match nobody, so the guard is explicit.
 */
export function leaders(tally: Tally): AreaTally[] {
  if (tally.areas.length === 0) return [];

  const top = Math.max(...tally.areas.map((area) => area.count));
  if (top === 0) return [];

  return tally.areas.filter((area) => area.count === top);
}

/**
 * How the range is named inside a sentence.
 *
 * Not `RANGE_LABEL`, which is what the dropdown says. "This month" is a fine
 * thing for a control to be labelled and a bad thing to paste into the middle of
 * a clause — "All time" would give "…your attention All time." These are the
 * same four ranges written as adverbials.
 *
 * A custom range says "in this range" rather than printing its dates. They are
 * already on screen twice by then, on the picker's own button and beside it, and
 * a sentence is the wrong third place for two more numbers.
 */
export function rangePhrase(range: Range): string {
  switch (range.kind) {
    case "month":
      return "this month";
    case "year":
      return "this year";
    case "all":
      return "so far";
    case "custom":
      return "in this range";
  }
}

/**
 * The chart, in words.
 *
 * A chart shows a shape and leaves the reading to you; this states the reading
 * so that the answer is on the page for someone who doesn't want to do it. It's
 * also the version a screen reader gets first, which is why it is generated from
 * the tally rather than written once and left to go stale.
 *
 * Every branch here exists because the honest sentence changes shape, not just
 * its nouns:
 *
 * - One leader is the ordinary case.
 * - Two or three tied leaders get named, because "tied" is more informative
 *   than a coin flip and the names still fit in a line.
 * - Four or more get counted instead of named. A sentence listing five life
 *   areas is a list wearing a sentence's clothes.
 * - Every area tied is not a tie at all, it's a flat month, and calling that a
 *   tie for the lead would be technically true and useless.
 *
 * Returns null when nothing is in range. The caller doesn't render the panel at
 * all in that case, and a sentence about zero marks would be a second empty
 * state competing with the one already on the page.
 *
 * One sentence, not two. It used to return a second line as well — "4 marks in
 * all, across 2 of your 6 areas" — on the theory that a reading should say what
 * it's out of. On the page that turned out to be a number you have to hold in
 * your head to use, printed directly above a table that gives you the same
 * totals broken down and doesn't ask you to hold anything. The lead is the part
 * that says something the table can't.
 */
export function takeaway(tally: Tally, phrase: string): string | null {
  const top = leaders(tally);
  if (top.length === 0) return null;

  const names = top.map((area) => area.areaName);
  const everyArea = top.length === tally.areas.length && tally.areas.length > 1;

  if (everyArea) {
    return `Your attention was spread evenly across every area ${phrase}.`;
  }
  if (names.length === 1) {
    return `${names[0]} held the greatest share of your attention ${phrase}.`;
  }
  if (names.length <= 3) {
    return `${listNames(names)} tied for the greatest share of your attention ${phrase}.`;
  }
  return `${names.length} areas tied for the greatest share of your attention ${phrase}.`;
}

/**
 * "A", "A and B", "A, B and C".
 *
 * No serial comma before the "and", matching the prose everywhere else in this
 * app. Only ever called with two or three names — `takeaway` counts first and
 * switches to a number above that, so this doesn't have to be good at long
 * lists.
 */
function listNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
