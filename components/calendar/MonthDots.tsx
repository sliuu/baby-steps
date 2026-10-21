"use client";

import { useMemo } from "react";

import { StickerMark } from "./StickerMark";
import type { PeriodProps } from "./period";
import { formatDayLong, fromDayString, monthGrid, weekdayLabels } from "@/lib/dates";
import type { DayString } from "@/lib/dates";
import { dayMatches } from "@/lib/highlight";
import { RULE } from "@/lib/layout";
import { monthSummary } from "@/lib/monthSummary";
import { categoryColor, wash } from "@/lib/palette";
import type { LibraryGroup } from "@/lib/queries/activities";
import { NO_STICKERS } from "@/lib/stickers";
import { useSettings } from "@/components/SettingsProvider";

/** Silent cap: four 5px dots fit one line in a 44px cell; the sheet has the count. */
const DOT_CAP = 4;

type Props = PeriodProps & {
  month: Date;
  /** For the activity-to-category map. */
  groups: LibraryGroup[];
  /** `CalendarPanel` owns the sheet. */
  onShowDay: (day: Date) => void;
  /** `CalendarPanel` renders phone + desktop and lets CSS pick. */
  className?: string;
};

/** Phone month: dot grid + summary. Dots aren't handles; the cell opens the sheet. */
export function MonthDots(props: Props) {
  const { weekStartsOn } = useSettings();
  const cells = useMemo(
    () => monthGrid(props.month, props.todayString, weekStartsOn),
    [props.month, props.todayString, weekStartsOn],
  );

  const labels = useMemo(() => weekdayLabels(weekStartsOn), [weekStartsOn]);

  /** Borrowed days at each end aren't counted. */
  const ownDays = useMemo<DayString[]>(
    () => cells.filter((cell) => cell.inMonth).map((cell) => cell.day),
    [cells],
  );

  /** Here, not in `monthSummary`: stable while the library is, unlike the summary. */
  const categoryOf = useMemo(() => {
    const map = new Map<string, string>();
    for (const group of props.groups) {
      for (const sticker of group.stickers) map.set(sticker.id, group.categoryName);
    }
    return map;
  }, [props.groups]);

  const summary = useMemo(
    () => monthSummary(ownDays, props.stickersByDay, categoryOf, props.todayString),
    [ownDays, props.stickersByDay, categoryOf, props.todayString],
  );

  const { highlight } = props;
  const faded = (matched: boolean) =>
    highlight && !matched ? "opacity-35" : "";

  return (
    <div className={`flex flex-col gap-s4 ${props.className ?? ""}`}>
      <div>
        {/* Labels share the cells' grid so columns align. "Sun", not "S". */}
        <div className={`grid grid-cols-7 gap-0.75 ${RULE} pt-s1`}>
          {labels.map((label) => (
            <div key={label} className="daylabel pb-1 text-center">
              {label}
            </div>
          ))}

          {cells.map((cell) => {
            const stickers = props.stickersByDay.get(cell.day) ?? NO_STICKERS;
            const lit = highlight ? dayMatches(highlight, stickers) : false;

            return (
              <button
                key={cell.day}
                type="button"
                onClick={() => props.onShowDay(fromDayString(cell.day))}
                data-day={cell.day}
                className={`flex h-11 flex-col items-center justify-center gap-1 rounded-lg transition-colors ${
                  cell.isToday
                    ? "bg-secondary"
                    : lit && highlight
                      ? wash(highlight.colorKey)
                      : "hover:bg-secondary/50"
                }`}
              >
                {/* Screen readers get the full date. */}
                <span className="sr-only">{formatDayLong(cell.day)}</span>

                <time
                  aria-hidden="true"
                  dateTime={cell.day}
                  // Dimmed, not blanked: a real, openable day, so muted (4.5:1), not faded.
                  className={`oldstyle text-ui leading-none ${
                    cell.isToday ? "font-medium" : ""
                  } ${cell.inMonth ? "" : "text-ink-muted"}`}
                >
                  {cell.dayOfMonth}
                </time>

                {/* Fixed 5px row keeps numerals aligned across rows. */}
                <span
                  aria-hidden="true"
                  className={`flex h-1.25 max-w-8.5 flex-wrap items-center justify-center gap-0.5 ${cell.inMonth ? "" : "opacity-40"}`}
                >
                  {stickers.activities.slice(0, DOT_CAP).map((sticker) => (
                    <span
                      key={sticker.id}
                      className={`size-1.25 rounded-full ${categoryColor(sticker.colorKey).dot} ${faded(
                        highlight?.activityIds.has(sticker.activityId) ?? false,
                      )}`}
                    />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <MonthReadout summary={summary} />
    </div>
  );
}

/** What the dots can't say, in words. No filled cards: one sentence about one month. */
function MonthReadout(props: { summary: ReturnType<typeof monthSummary> }) {
  const { summary } = props;

  return (
    <div className={`${RULE} flex flex-col gap-s3 pt-s3`}>
      <div className="flex flex-col gap-s1">
        <h2 className="eyebrow text-ink-muted">This month so far</h2>

        <div className="flex items-end gap-s4">
          <Figure value={summary.daysMarked} label="days marked" />
          <Figure value={summary.stickers} label="stickers" />
          <Figure value={summary.categories} label="categories touched" />
        </div>
      </div>

      {summary.leaders.length > 0 && (
        <div className="flex flex-col gap-s1">
          <h2 className="eyebrow text-ink-muted">Most marked</h2>

          <ul className="flex flex-col">
            {summary.leaders.map((leader, index) => (
              <li
                key={leader.activityId}
                className={`flex items-center gap-s2 py-s1 ${
                  index > 0 ? "border-t border-rule-grid" : ""
                }`}
              >
                <StickerMark sticker={leader} />

                <span className="min-w-0 flex-1 truncate text-ui">
                  {leader.name}
                </span>

                {/* Cadence softer than count: it's an approximation. */}
                <span className="tabular shrink-0 text-label text-ink-muted">
                  {leader.count}×
                </span>
                <span className="shrink-0 text-label text-ink-muted">
                  {leader.cadence}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-label text-ink-muted">
        {summary.daysMarked === 0
          ? "Nothing on the month yet. Tap a day to put something on it."
          : `${summary.daysMarked} of ${summary.elapsed} days so far. Tap a day to add to it.`}
      </p>
    </div>
  );
}

/** A big oldstyle number over a small caption. */
function Figure(props: { value: number; label: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="oldstyle font-heading text-subhead leading-none">
        {props.value}
      </span>
      <span className="text-caption text-ink-muted">{props.label}</span>
    </div>
  );
}
