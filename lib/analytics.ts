// Every value import here is relative with its extension. `lib/analytics.test.ts`
// runs this module under `node --test`, where nothing resolves `@/` — that alias
// belongs to the bundler. The type imports below are erased and cross freely,
// which is why they can keep the alias.
//
// `./moods.ts` is the only value import, and it is safe to take because that
// module imports nothing itself. A module with no imports can always be pulled
// into a tested one; the rule that bites is depth, not count.
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
