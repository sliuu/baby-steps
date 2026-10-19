import { RANGE_LABEL, type Bounds, type Range } from "@/lib/analytics";
import { formatDayShort } from "@/lib/dates";

// Shared so periods print alike. Not in analytics.ts: date-fns vs `node --test`.

/** Dates beside a range dropdown; null for "All time" and custom (already shown). */
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

/** Self-contained accessible name for a list/table (never drawn). */
export function captionFor(what: string, range: Range, bounds: Bounds): string {
  const where = spanLabel(range, bounds);
  if (range.kind === "custom" && bounds.from && bounds.to) {
    return `${what}, ${formatDayShort(bounds.from)} to ${formatDayShort(bounds.to)}`;
  }
  return where
    ? `${what}, ${RANGE_LABEL[range.kind]}: ${where}`
    : `${what}, ${RANGE_LABEL[range.kind]}`;
}
