"use client";

import { Tabs as TabsPrimitive } from "radix-ui";
import { useMemo, useState } from "react";

import { useCalendarData } from "@/components/calendar/calendarData";
import { useSettings } from "@/components/SettingsProvider";
import { navLinkClass } from "@/components/TopNav";
import { HabitList } from "./HabitList";
import { HabitTable } from "./HabitTable";
import { MoodBars } from "./MoodBars";
import { MoodLine } from "./MoodLine";
import { RangePicker } from "./RangePicker";
import { captionFor, spanLabel } from "./rangeText";
import { Readout } from "./Readout";
import { TrendsPie } from "./TrendsPie";
import { TrendsSkeleton } from "@/components/views/TrendsSkeleton";
import {
  moodSeries,
  moodTakeaway,
  moodTally,
  rangePhrase,
  resolveBounds,
  takeaway,
  tally,
  type Range,
} from "@/lib/analytics";
import type { DayString } from "@/lib/dates";
import { daysBetween } from "@/lib/daymath";
import { earliestPlacement, habitTable, habitWindow } from "@/lib/habits";
import { PANEL, RULE, SECTION_TITLE, TITLE } from "@/lib/layout";
import type { LibraryGroup } from "@/lib/queries/activities";
import type { StickersByDay } from "@/lib/stickers";
import { useToday } from "@/lib/useToday";

type Props = {
  groups: LibraryGroup[];
  stickersByDay: StickersByDay;
};

const TABS = [
  { id: "categories", label: "categories" },
  { id: "habits", label: "habits" },
  { id: "moods", label: "moods" },
] as const;

type TrendsTab = (typeof TABS)[number]["id"];

/** Skeleton until the browser knows the visitor's day; the server can't. */
export function TrendsBoard(props: Props) {
  const todayString = useToday(null);
  if (!todayString) return <TrendsSkeleton />;
  return <Board {...props} todayString={todayString} />;
}

/** Trends: three tabs over one range. Owns the range and every derived number. */
function Board(props: Props & { todayString: DayString }) {
  // Live edits from the calendar, if this snapshot is current.
  const { snapshot } = useCalendarData();
  const stickersByDay =
    snapshot?.source === props.stickersByDay ? snapshot.data : props.stickersByDay;
  const { todayString } = props;

  const [range, setRange] = useState<Range>({ kind: "month" });
  const [tab, setTab] = useState<TrendsTab>("categories");

  const { weekStartsOn } = useSettings();
  const bounds = useMemo(() => resolveBounds(range, todayString, weekStartsOn), [range, todayString, weekStartsOn]);
  const totals = useMemo(
    () => tally(stickersByDay, props.groups, bounds),
    [stickersByDay, props.groups, bounds],
  );
  const moods = useMemo(() => moodTally(stickersByDay, bounds), [stickersByDay, bounds]);
  const series = useMemo(() => moodSeries(stickersByDay, bounds), [stickersByDay, bounds]);
  const earliest = useMemo(() => earliestPlacement(stickersByDay), [stickersByDay]);
  const habitSpan = useMemo(
    () => habitWindow(bounds, todayString, earliest),
    [bounds, todayString, earliest],
  );
  const habits = useMemo(
    () => habitTable(stickersByDay, props.groups, habitSpan),
    [stickersByDay, props.groups, habitSpan],
  );
  const archived = useMemo(
    () =>
      new Set(
        props.groups.flatMap((group) =>
          group.stickers.filter((sticker) => sticker.archived).map((sticker) => sticker.id),
        ),
      ),
    [props.groups],
  );

  // Days a mood could have been logged: range start (or first data) to today.
  const recordable = useMemo(() => {
    const end = bounds.to && bounds.to < todayString ? bounds.to : todayString;
    const start =
      bounds.from ??
      [series.from, earliest].filter((day): day is DayString => day !== null).sort()[0];
    if (!start || start > end) return null;
    return daysBetween(start, end) + 1;
  }, [bounds, series.from, earliest, todayString]);

  const span = spanLabel(range, bounds);
  const phrase = rangePhrase(range);
  const summary = useMemo(() => takeaway(totals, phrase), [totals, phrase]);
  const drift = useMemo(() => moodTakeaway(series, phrase), [series, phrase]);
  const recordCaption = captionFor("Days by mood", range, bounds);

  return (
    // No PAGE_WIDTH: AppShell's <main> has it.
    <TabsPrimitive.Root
      value={tab}
      onValueChange={(next) => setTab(next as TrendsTab)}
      className="flex flex-col gap-s5"
    >
      <div className="flex flex-col gap-s3 lg:flex-row lg:items-end lg:justify-between lg:gap-s4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-s4">
          <h1 className={TITLE}>
            trends
          </h1>
          {/* Radix primitive: tablist role and arrow keys, no styles to undo. */}
          <TabsPrimitive.List aria-label="trends" className="flex items-baseline gap-s4">
            {TABS.map((entry) => (
              <TabsPrimitive.Trigger
                key={entry.id}
                value={entry.id}
                className={navLinkClass(tab === entry.id)}
              >
                {entry.label}
              </TabsPrimitive.Trigger>
            ))}
          </TabsPrimitive.List>
        </div>

        {/* Outside the tabs: one range governs all three. */}
        <div className="flex items-center justify-between gap-s3 lg:justify-end lg:pb-1">
          <RangePicker value={range} onChange={setRange} />
          {span && (
            // Announces the resolved dates when the range changes.
            <p aria-live="polite" className="tabular text-right text-caption text-ink-muted lowercase">
              {span}
            </p>
          )}
        </div>
      </div>

      <TabsPrimitive.Content value="categories" className={CONTENT}>
        {totals.total === 0 ? (
          <Empty range={range} />
        ) : (
          <div className="grid items-start gap-x-s7 gap-y-s6 lg:grid-cols-2">
            {/* `min-w-0`: let grid columns shrink below their content. */}
            {/* ChartCard wears the rule, level with the bars'. */}
            <div className="min-w-0">
              <TrendsPie tally={totals} />
            </div>

            <section aria-labelledby="trends-by-category" className={`min-w-0 ${PANEL}`}>
              <h2 id="trends-by-category" className={`mb-s4 ${SECTION_TITLE}`}>
                by category
              </h2>
              <Readout
                tally={totals}
                takeaway={summary}
                caption={captionFor("Marks by category", range, bounds)}
              />
            </section>

            {/* Marks from stickers no longer in the library. */}
            {totals.unattributed > 0 && (
              <p className="text-label text-ink-muted lg:col-span-2">
                {totals.unattributed} mark{totals.unattributed === 1 ? "" : "s"} came from
                stickers that are no longer in your tray, so they aren&rsquo;t counted under
                any category.
              </p>
            )}
          </div>
        )}
      </TabsPrimitive.Content>

      {/* Same rows twice: a list on phones, the sortable table on wide screens. */}
      <TabsPrimitive.Content value="habits" className={CONTENT}>
        <div className={`lg:hidden ${PANEL}`}>
          <HabitList
            rows={habits}
            archived={archived}
            caption={captionFor("Every habit", range, bounds)}
            today={todayString}
          />
        </div>
        <div className="hidden lg:block">
          <HabitTable
            rows={habits}
            window={habitSpan}
            caption={captionFor("Every habit", range, bounds)}
            today={todayString}
          />
        </div>
      </TabsPrimitive.Content>

      <TabsPrimitive.Content value="moods" className={CONTENT}>
        <div className="flex flex-col gap-s6">
          <div className="grid items-start gap-x-s7 gap-y-s6 lg:grid-cols-2">
            <section aria-label={recordCaption} className={`flex min-w-0 flex-col ${PANEL}`}>
              <h2 className={`mb-s4 ${SECTION_TITLE}`}>by mood</h2>
              <MoodBars moods={moods} />
            </section>

            <MoodLine series={series} takeaway={drift} className={`min-w-0 ${PANEL}`} />
          </div>

          {moods.total > 0 && recordable !== null && (
            <div className={`flex justify-between pt-s2 text-caption text-ink-muted ${RULE}`}>
              <span>days recorded</span>
              <span className="tabular">
                {moods.total} of {Math.max(recordable, moods.total)}
              </span>
            </div>
          )}
        </div>
      </TabsPrimitive.Content>
    </TabsPrimitive.Root>
  );
}

const CONTENT =
  // Radix makes a panel focusable; it gets the app's ring.
  "rounded-sm text-label outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring) focus-visible:ring-offset-4 focus-visible:ring-offset-paper animate-in fade-in-0 duration-150 motion-reduce:animate-none";

function Empty(props: { range: Range }) {
  return (
    <div className={`${RULE} border-dashed px-s6 py-s7 text-center`}>
      <p className="text-ink-muted">{emptyMessage(props.range)}</p>
    </div>
  );
}

function emptyMessage(range: Range): string {
  if (range.kind === "custom" && (!range.from || !range.to)) {
    return "pick a start and an end date to see what falls between them.";
  }
  if (range.kind === "all") {
    return "no stickers placed yet. add one on today and it will show up here.";
  }
  return "nothing placed in this range. try a wider one.";
}
