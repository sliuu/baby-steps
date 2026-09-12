// One value import, relative and with its extension, into a module that itself
// imports nothing — the rule `lib/analytics.ts` states: what bites is depth, not
// count. This module runs under `node --test`, where `@/` resolves to nothing
// because that alias belongs to the bundler. The three imports below it are
// `import type` and are erased before Node ever looks at a path, so they can
// keep the alias.
//
// `dayToUTC`/`utcToDay` used to be private to this file. They left for
// `lib/daymath.ts` when the mood series became their second caller.
import { addDays } from "./daymath.ts";
import type { DayString } from "@/lib/dates";
import type { LibraryGroup } from "@/lib/queries/activities";
import type { StickersByDay } from "@/lib/stickers";

/**
 * How many days the strip shows: the last eight weeks, ending today.
 *
 * Rolling rather than a calendar period, and that's a deliberate difference
 * from everything else on this page. The range picker above deals in *periods
 * you are inside* — this month, this year — because the question there is "how
 * did that period go". The strip asks a different question: what does the
 * rhythm of this habit look like *lately*. A calendar period answers that badly
 * on the 1st of every month, when the picture you built up empties overnight.
 *
 * **It was a rolling year, and the year was costing more than it bought.** 365
 * legible squares is about three screens wide, so the strip could only ever be
 * a full-bleed band that scrolled — which in turn meant it could not sit beside
 * the ranking it belongs with, and the eleven months you had to scroll past
 * were eleven months you never looked at. Eight weeks is a span you can see all
 * of at once, next to the panel that says which habits it's about.
 *
 * A multiple of seven, so every column of the strip is the same weekday. That
 * is most of what makes a density picture readable: "I only ever do this at
 * weekends" is a vertical stripe when the weeks line up and nothing at all when
 * they drift. Eight of them is two months — long enough for a habit that
 * stopped three weeks ago to look stopped, short enough to fit.
 */
export const HEATMAP_WEEKS = 8;
export const HEATMAP_DAYS = HEATMAP_WEEKS * 7;

/** Short month names, for the labels along the top of the strip. */
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * The `length` days ending on `end`, oldest first, inclusive of both edges.
 *
 * Oldest first because that's the direction it's drawn in, and an array whose
 * order is the drawing order means the component never reverses anything. The
 * index into this array *is* the column number, which is what lets the month
 * labels be positioned by arithmetic instead of by measuring the DOM.
 */
export function dayWindow(end: DayString, length: number): DayString[] {
  if (length <= 0) return [];

  const days: DayString[] = [];
  for (let i = length - 1; i >= 0; i--) days.push(addDays(end, -i));
  return days;
}

/**
 * Where a month starts inside the window, and what to call it.
 *
 * `index` is the column the label sits over. The first few columns are skipped
 * — a label at column 0 or 2 is a month whose first days are off the left edge,
 * and printing it there claims the strip starts at a month boundary when it
 * doesn't.
 *
 * January carries its year. The window is short enough now that it crosses a
 * new year only in late December and January, but that is exactly when a bare
 * "Jan" beside a "Dec" is ambiguous about which side of the boundary you're
 * looking at. Marking it on the one label that changes is cheaper than stamping
 * a year on all of them, and the rule survives if the window ever grows again.
 */
export type MonthLabel = { index: number; label: string };

export function monthLabels(window: DayString[]): MonthLabel[] {
  const labels: MonthLabel[] = [];

  window.forEach((day, index) => {
    if (day.slice(8, 10) !== "01") return;
    // Too close to the edge to belong to a month the strip actually shows.
    if (index < 3) return;

    const month = Number(day.slice(5, 7)) - 1;
    labels.push({
      index,
      label:
        month === 0 ? `${MONTHS[month]} ${day.slice(2, 4)}` : MONTHS[month],
    });
  });

  return labels;
}

/** One habit's year: a count for every day in the window, in window order. */
export type HeatRow = {
  activityId: string;
  name: string;
  mark: string;
  colorKey: string;
  /** `counts[i]` is how many marks landed on `window[i]`. Usually 0 or 1. */
  counts: number[];
  /** Days in the window carrying at least one mark. What the strip shows. */
  days: number;
  /** Marks in the window. Higher than `days` if a habit was doubled up. */
  total: number;
  /** The most recent day in the window it was placed, or null for a blank row. */
  last: DayString | null;
};

/**
 * Every habit's rolling year, one row each, in library order.
 *
 * Library order rather than sorted, which is the same call `LifeStar` makes and
 * for the same reason: the rows are grouped by life area, so the colours come
 * out in bands and the strip is comparable with itself from one visit to the
 * next. Sorting by count would put the block in a different order every month
 * and make "has this changed?" impossible to answer by looking. The ranking
 * question is answered by `activityTally` a panel above; this one is about
 * rhythm.
 *
 * Counts, not booleans, even though a habit is done-or-not on almost every day.
 * Nothing stops you dropping the same sticker on a Tuesday twice, the database
 * records both, and a strip that quietly collapsed them would be the one place
 * in the app where a mark you placed left no trace.
 *
 * **Which rows exist** is the one real judgement here. A live sticker always
 * gets a row, including an empty one — "you have this habit and did none of it
 * this year" is a reading, and it's the reading a tracker exists to give you.
 * An *archived* sticker only gets a row if it was actually done inside the
 * window: it's no longer offered in the tray, so an empty row for it is a
 * question nobody asked, but a year you spent doing it is still your year.
 *
 * Marks whose activity isn't in the library at all are dropped rather than
 * counted under a made-up row. That's the deleted-and-not-yet-refetched window
 * `Tally.unattributed` documents, and the panel above already says so out loud.
 */
export function heatmap(
  stickersByDay: StickersByDay,
  groups: LibraryGroup[],
  window: DayString[],
): HeatRow[] {
  // Column number by day string. One pass now turns every lookup below into a
  // hash hit instead of an `indexOf` over the whole window.
  const column = new Map<DayString, number>();
  window.forEach((day, i) => column.set(day, i));

  const rows = new Map<string, HeatRow>();
  const archived = new Set<string>();

  for (const group of groups) {
    for (const sticker of group.stickers) {
      if (sticker.archived) archived.add(sticker.id);
      rows.set(sticker.id, {
        activityId: sticker.id,
        name: sticker.name,
        mark: sticker.mark,
        colorKey: sticker.colorKey,
        counts: new Array(window.length).fill(0),
        days: 0,
        total: 0,
        last: null,
      });
    }
  }

  // Over the placements, not over the window: the map holds only days that have
  // something on them, so this is one pass over what exists rather than one
  // lookup per habit per day.
  for (const [day, stickers] of stickersByDay) {
    const i = column.get(day);
    if (i === undefined) continue;

    for (const sticker of stickers.activities) {
      const row = rows.get(sticker.activityId);
      if (!row) continue;

      // The first mark of the day is the one that makes it a day. Counting
      // `days` here rather than in a second pass is what keeps `days` and
      // `counts` from ever disagreeing.
      if (row.counts[i] === 0) row.days++;
      row.counts[i]++;
      row.total++;
      if (!row.last || day > row.last) row.last = day;
    }
  }

  return [...rows.values()].filter(
    (row) => row.total > 0 || !archived.has(row.activityId),
  );
}

/**
 * A day's count as one of three shades.
 *
 * Three and not GitHub's five, because the data has nothing to say at five
 * steps. A commit graph shades a number that genuinely ranges from 1 to 40; a
 * habit is done, or done twice, and pretending to a scale would be drawing
 * precision that isn't there. 0 is the empty track, 1 is the sticker's own
 * fill, and 2-or-more is the same hue at full pastel — the only jump the data
 * can actually support.
 */
export function heatLevel(count: number): 0 | 1 | 2 {
  if (count <= 0) return 0;
  return count === 1 ? 1 : 2;
}
