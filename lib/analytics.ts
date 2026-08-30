// Every value import here is relative with its extension, and there are none:
// this module does no date maths and touches no library. `lib/analytics.test.ts`
// runs it under `node --test`, where nothing resolves `@/` — that alias belongs
// to the bundler. The type imports below are erased and cross freely.
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
   * Always 0 today, because nothing archives a sticker yet. It exists so that
   * the day something does, the totals get a visible hole instead of a silent
   * one: `getStickerLibrary` filters `archived`, so an archived activity's past
   * placements would stop being attributable to an area and would simply stop
   * being counted. A number nobody can see going quietly wrong is the failure
   * mode worth spending a field on.
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
