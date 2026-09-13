import { RANGE_LABEL, type Bounds, type Range } from "@/lib/analytics";
import { formatDayShort } from "@/lib/dates";

/**
 * What a range rule resolves to, in dates, and what to call the thing it
 * filters.
 *
 * Shared rather than local because there are two range pickers on this page
 * now — the band above the tabs drives the star, the ranking and the moods, and
 * the habit table carries its own — and the two have to print a period the same
 * way. Two copies of "1 Sep — 13 Sep" is two chances for one of them to grow an
 * en dash or drop a year.
 *
 * Not in `lib/analytics.ts`, which is where `Range` itself lives, because these
 * format dates: `lib/dates.ts` reaches date-fns, and analytics is one of the
 * modules kept importable by `node --test`. See the note at the top of
 * `lib/habits.ts`.
 */

/**
 * The dates beside a range dropdown, or null when there's nothing to add.
 *
 * Null in exactly two cases, both of them "the control already said it". "All
 * time" has no edges to print, and its own label is the complete answer. A
 * custom range prints its dates on the popover button itself, so repeating them
 * two inches to the right is the same string twice.
 *
 * So this earns its place only for the fixed ranges, which are the ones whose
 * label is a *rule* — "This month" doesn't tell you it means the 1st to the
 * 13th, and that's the number you'd want to check against the calendar.
 */
export function spanLabel(range: Range, bounds: Bounds): string | null {
  if (range.kind === "custom") return null;
  if (!bounds.from && !bounds.to) return null;
  if (bounds.from && bounds.to) {
    return bounds.from === bounds.to
      ? formatDayShort(bounds.from)
      : `${formatDayShort(bounds.from)} — ${formatDayShort(bounds.to)}`;
  }
  if (bounds.from) return `From ${formatDayShort(bounds.from)}`;
  return `Up to ${formatDayShort(bounds.to!)}`;
}

/**
 * A table's accessible name. Never drawn — see the prop's note in `AreaTable`.
 *
 * Says more than `spanLabel` deliberately: on screen the rule and the dates sit
 * beside each other and the table is directly below them, so proximity does the
 * work. A screen reader entering the table has left all of that behind, so this
 * has to be self-contained.
 *
 * `what` is passed in rather than fixed because the two tables count two
 * different units and are on two different tabs — a shared caption would name
 * the wrong one on one of them.
 */
export function captionFor(what: string, range: Range, bounds: Bounds): string {
  const where = spanLabel(range, bounds);
  if (range.kind === "custom" && bounds.from && bounds.to) {
    return `${what}, ${formatDayShort(bounds.from)} to ${formatDayShort(bounds.to)}`;
  }
  return where
    ? `${what}, ${RANGE_LABEL[range.kind]}: ${where}`
    : `${what}, ${RANGE_LABEL[range.kind]}`;
}
