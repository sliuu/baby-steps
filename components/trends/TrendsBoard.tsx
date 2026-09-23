"use client";

import { Tabs as TabsPrimitive } from "radix-ui";
import { useMemo, useState } from "react";

import { useCalendarData } from "@/components/calendar/calendarData";
import { HabitList } from "./HabitList";
import { HabitTable } from "./HabitTable";
import { LifeStar } from "./LifeStar";
import { MoodBars } from "./MoodBars";
import { MoodLine } from "./MoodLine";
import { RangePicker } from "./RangePicker";
import { captionFor, spanLabel } from "./rangeText";
import { Readout } from "./Readout";
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
import { PAGE_TITLE, PILL_TRACK, RULE, pill } from "@/lib/layout";
import type { LibraryGroup } from "@/lib/queries/activities";
import type { StickersByDay } from "@/lib/stickers";
import { useToday } from "@/lib/useToday";

type Props = {
  groups: LibraryGroup[];
  stickersByDay: StickersByDay;
  /**
   * The server's idea of today, used for the first paint and for hydration.
   *
   * Passed down rather than read here, so the two renders agree on a value.
   * See the store below for why that matters.
   */
  initialToday: DayString;
};

/**
 * The three lenses, in reading order, each answering one question.
 *
 * The split is by *unit*, not by chart type, and that's what makes it a real
 * division rather than three drawers to put panels in. Areas counts marks
 * rolled up to the six life areas; Habits counts them at the grain they were
 * placed at; Moods counts days. Every panel that shares a unit is on one tab,
 * and no tab holds two.
 *
 * Areas leads because it's the page's summary — the sentence at the top of it
 * is the one line that answers "how did this month go" without you reading
 * anything else.
 */
const TABS = [
  { id: "areas", label: "Areas" },
  { id: "habits", label: "Habits" },
  { id: "moods", label: "Moods" },
] as const;

type TrendsTab = (typeof TABS)[number]["id"];

/**
 * The Trends page: a range, and the numbers that fall inside it.
 *
 * The client/server seam is the same one Step 7 drew and every step since has
 * kept. `TrendsView` fetches; this draws. What's new is that the drawing side
 * now *computes* — the grouping happens here, in the browser, over data the page
 * already holds.
 *
 * **Three tabs, and this is not the switcher coming back.** The control deleted
 * last step sat inside one card and chose between three drawings of the *same*
 * six numbers, so it cost a click to learn nothing. These divide the page's
 * content, which had grown to a radar, a table, a ranking, a five-mood strip
 * and a grid of every habit's last eight weeks stacked down one screen. A
 * control that hides an
 * alternative rendering is furniture; a control that hides half the facts is
 * navigation, and this page had enough facts to need some.
 */
export function TrendsBoard(props: Props) {
  const { snapshot } = useCalendarData();
  const stickersByDay =
    snapshot?.source === props.stickersByDay
      ? snapshot.data
      : props.stickersByDay;
  /**
   * The visitor's own date, one frame late on purpose.
   *
   * "This month" is a question about the clock, and the server's clock is not
   * the visitor's — a server in UTC and a browser in California are on different
   * dates for seven hours of every day. Reading `new Date()` during render would
   * let the two renders disagree and React would hydrate against markup that
   * doesn't match. `useSyncExternalStore`'s third argument is the value used on
   * the server *and* during hydration, so both runs use the server's date and
   * React switches to the real one immediately after. Same shape as `MonthGrid`,
   * except that the server value arrives as a prop instead of being recomputed —
   * a value computed twice in two places is a value that can differ.
   */
  const todayString = useToday(props.initialToday);

  /**
   * Which stretch of time you're looking at. UI state, exactly like Step 11's
   * highlight: it isn't a fact about your month, it's a way of reading one, and
   * it should die on refresh.
   */
  const [range, setRange] = useState<Range>({ kind: "month" });

  /** Which lens. UI state for the same reason `range` is, and not in the URL
   *  for the same reason: the nav's three sections are places you can be sent
   *  to, and these are not — they're where you happen to be looking on one. */
  const [tab, setTab] = useState<TrendsTab>("areas");

  const bounds = useMemo(
    () => resolveBounds(range, todayString),
    [range, todayString],
  );

  /**
   * The reason this is memoized isn't speed — six areas and a few hundred marks
   * is nothing. It's identity. This object becomes props for the table and the
   * star, and a fresh object every render means both re-render on every
   * keystroke anywhere on the page. `useMemo` is what lets the things below it
   * be skippable.
   */
  const totals = useMemo(
    () => tally(stickersByDay, props.groups, bounds),
    [stickersByDay, props.groups, bounds],
  );

  /**
   * A second pass over the same map, memoized for the same reason `totals` is.
   * Separate from `tally` because they count different units — placements
   * against days — see the note on `moodTally`.
   */
  const moods = useMemo(
    () => moodTally(stickersByDay, bounds),
    [stickersByDay, bounds],
  );

  /**
   * The same days again, keeping the dates this time. `moodTally` counts how
   * many days felt each way and deliberately throws the calendar out, which is
   * the axis a line needs — so it's a separate walk rather than a wider return
   * shape that every caller would take half of.
   */
  const series = useMemo(
    () => moodSeries(stickersByDay, bounds),
    [stickersByDay, bounds],
  );

  /**
   * The first day anything was ever placed, which is what closes an open left
   * edge — "all time" is two nulls, and a rate needs a denominator. Its own
   * memo because it is a scan of the whole map that only changes when the
   * data does: switching range must not re-walk every day ever recorded.
   */
  const earliest = useMemo(
    () => earliestPlacement(stickersByDay),
    [stickersByDay],
  );

  /** The range as a closed window, for the habit rows and their plot. */
  const habitSpan = useMemo(
    () => habitWindow(bounds, todayString, earliest),
    [bounds, todayString, earliest],
  );

  /**
   * Every habit's row, once, for both drawings of the tab: the phone's list
   * and the wide screen's table. Both are mounted and CSS shows one, so
   * counting inside each would walk the map twice for one screen's worth.
   */
  const habits = useMemo(
    () => habitTable(stickersByDay, props.groups, habitSpan),
    [stickersByDay, props.groups, habitSpan],
  );

  /** `HabitRow` doesn't say whether its sticker is archived; the library does. */
  const archived = useMemo(
    () =>
      new Set(
        props.groups.flatMap((group) =>
          group.stickers
            .filter((sticker) => sticker.archived)
            .map((sticker) => sticker.id),
        ),
      ),
    [props.groups],
  );

  /**
   * The "13" in "12 of 13": the days the range has had so far. It stops at
   * today — a month isn't short of moods for days that haven't happened — and
   * an open left edge starts at the first thing you ever recorded, a mood or a
   * mark. Null for a range that hasn't started.
   */
  const recordable = useMemo(() => {
    const end = bounds.to && bounds.to < todayString ? bounds.to : todayString;
    const start =
      bounds.from ??
      [series.from, earliest]
        .filter((day): day is DayString => day !== null)
        .sort()[0];
    if (!start || start > end) return null;
    return daysBetween(start, end) + 1;
  }, [bounds, series.from, earliest, todayString]);

  const span = spanLabel(range, bounds);

  /**
   * The range as an adverbial, inside both takeaway sentences. Computed here
   * so they can't drift into saying "this month" and "across the month" about
   * the same fortnight.
   */
  const phrase = rangePhrase(range);

  // Cheap, but it takes `totals` as input, so it re-derives on every render of
  // a component that re-renders on every keystroke in the date picker. Free to
  // memoize, and it keeps `Readout`'s props stable.
  const summary = useMemo(() => takeaway(totals, phrase), [totals, phrase]);

  /** The mood tab's answer to `summary`, and the chart's accessible equivalent
   *  — which is why it's computed here rather than inside `MoodLine`: it has
   *  branches worth a test, and `lib/analytics.test.ts` can reach it there. */
  const drift = useMemo(() => moodTakeaway(series, phrase), [series, phrase]);

  const recordCaption = captionFor("Days by mood", range, bounds);

  return (
    // No PAGE_WIDTH here. `AppShell`'s <main> already carries it, and applying
    // it again would nest one max-width inside an identical one and pay the
    // horizontal padding twice — the page would look inset from itself.
    <div className="flex flex-col gap-5">
      <h1 className={PAGE_TITLE}>Trends</h1>

      {/* Radix's own primitive rather than `components/ui/tabs`. The shadcn
          wrapper's two variants are a boxed list and an underline, and
          restyling either into a tracked pill means overriding its active
          state class by class. The primitive brings what the wrapper was
          for — the tablist role, `aria-selected`, arrow keys — and nothing to
          fight. */}
      <TabsPrimitive.Root
        value={tab}
        onValueChange={(next) => setTab(next as TrendsTab)}
        className="flex flex-col gap-6 lg:gap-8"
      >
        {/* One band: which lens, then which range.

            The range picker governs all three tabs, so it stays outside them —
            moving it inside would mean three copies of one control, or a
            control that appears to reset when you switch.

            Stacked on a phone, the pill full width and the range row under it
            with the dates pushed to the far edge. On a wide screen the two sit
            on one line, the pill on the left at a fixed width — three equal
            segments stretched across 1500px are three buttons nobody can find
            the edges of. */}
        <div className="flex flex-col gap-[18px] lg:flex-row lg:items-center lg:justify-between lg:gap-6">
          {/* **A pill, and the rule that used to forbid it is gone.** These
              were underlined tabs, on the argument that two segmented pills
              on one screen read as two levels of navigation. The phone's
              navigation is now the same tracked pill — see `PILL_TRACK` — and
              on a wide screen the nav's is a lighter drawing, so the pill here
              reads as "one of three, all on screen" rather than as a second
              menu. */}
          <TabsPrimitive.List
            aria-label="Trends"
            className={`grid w-full grid-cols-3 gap-1 lg:w-[22rem] ${PILL_TRACK}`}
          >
            {TABS.map((entry) => (
              <TabsPrimitive.Trigger
                key={entry.id}
                value={entry.id}
                className={pill(tab === entry.id)}
              >
                {entry.label}
              </TabsPrimitive.Trigger>
            ))}
          </TabsPrimitive.List>

          <div className="flex items-center justify-between gap-3 lg:justify-end lg:gap-4">
            <RangePicker value={range} onChange={setRange} />

            {/* The dates the rule resolved to, right where the rule is set. The
                dropdown says what you picked; this says what that means today,
                and the pair is only useful side by side. */}
            {span && (
              <p
                // The dates change when the dropdown changes but the dropdown
                // doesn't announce them, so a screen reader would hear the new
                // rule and never the new period.
                aria-live="polite"
                className="tabular text-right text-[0.78rem] text-ink-muted lg:text-[0.83rem]"
              >
                {span}
              </p>
            )}
          </div>
        </div>

        {/* Areas — the six life areas, as bars, and beside them on a wide
            screen as a shape. */}
        <TabsPrimitive.Content value="areas" className={CONTENT}>
          {totals.total === 0 ? (
            <Empty range={range} />
          ) : (
            // Two columns from `lg`: the star on the left, the bars on the
            // right. Below it the star isn't drawn at all — a radar at 335px
            // is six labels fighting for the edges, and the bars carry the
            // same proportions in a shape a thumb can read.
            //
            // `items-start` matters more than it looks: without it the grid
            // stretches both columns to the taller one's height, and the chart
            // card — which is a fixed ratio by design — would be pulled out of
            // shape by however long the bars happen to be.
            <div className="grid items-start gap-x-14 gap-y-6 lg:grid-cols-2">
              {/* `min-w-0` because a grid column's default minimum is its
                  content, and the card would otherwise refuse to shrink and
                  push the bars off the page. */}
              <div className="hidden min-w-0 lg:block">
                <LifeStar tally={totals} />
              </div>

              {/* `PANEL`, spelled out behind `lg:` — the star's card wears the
                  rule, and on a wide screen the two halves should read as one
                  rule broken by the gap between them. On a phone the bars sit
                  straight under the range row, which is rule enough. */}
              <div className="min-w-0 lg:border-t-2 lg:border-rule lg:pt-4">
                <Readout
                  tally={totals}
                  takeaway={summary}
                  caption={captionFor("Marks by life area", range, bounds)}
                />
              </div>

              {/* Zero today, and it stays invisible while it is. It exists so
                  that once something can archive a sticker, marks that stop
                  being attributable say so instead of quietly leaving the
                  total. On this tab and not the others because it is a fact
                  about *attribution to an area*. */}
              {totals.unattributed > 0 && (
                <p className="text-[0.83rem] text-ink-muted lg:col-span-2">
                  {totals.unattributed} mark
                  {totals.unattributed === 1 ? "" : "s"} came from stickers that
                  are no longer in your tray, so they aren&rsquo;t counted under
                  any area.
                </p>
              )}
            </div>
          )}
        </TabsPrimitive.Content>

        {/* Habits — the same marks at the grain they were placed at. One set
            of rows, drawn twice: a list on a phone, where six columns would
            scroll sideways, and the sortable table on a wide screen. The
            ranked bars that used to sit above the table are gone — the table
            opens sorted by marks, which is the same ranking with the numbers
            beside it. */}
        <TabsPrimitive.Content value="habits" className={CONTENT}>
          <div className="lg:hidden">
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

        {/* Moods — days, not marks, which is why they get their own tab. How
            many days felt each way, then which way it went. Neither is a
            summary of the other: the bars say nothing about when, the line
            says nothing about how often. Stacked on a phone; side by side on a
            wide screen, the bars on the left because they are read first. */}
        <TabsPrimitive.Content value="moods" className={CONTENT}>
          <div className="flex flex-col gap-6">
            <div className="grid items-start gap-x-14 gap-y-6 lg:grid-cols-2">
              <section
                aria-label={recordCaption}
                className="flex min-w-0 flex-col gap-3 lg:border-t-2 lg:border-rule lg:pt-4"
              >
                {/* Wide screens only. On a phone the bars are the first thing
                    under the range and need no name; beside a labelled chart
                    they'd be the one column without one. */}
                <h2 className="eyebrow hidden lg:block">By mood</h2>
                <MoodBars moods={moods} />
              </section>

              {/* A hairline above it on a phone, the page's rule on a wide
                  screen, where it heads a column of its own. */}
              <MoodLine
                series={series}
                takeaway={drift}
                className="min-w-0 border-t border-hairline pt-5 lg:border-t-2 lg:border-rule lg:pt-4"
              />
            </div>

            {moods.total > 0 && recordable !== null && (
              <div className="flex justify-between border-t border-hairline pt-3 text-[0.78rem] text-ink-muted">
                <span>Days recorded</span>
                <span className="tabular">
                  {moods.total} of {Math.max(recordable, moods.total)}
                </span>
              </div>
            )}
          </div>
        </TabsPrimitive.Content>
      </TabsPrimitive.Root>
    </div>
  );
}

/**
 * Every tab's panel. `text-sm` because the table inside Habits was written
 * against the shadcn wrapper's panel, which sets it. The fade is the design's
 * cross-fade on switching tab, and it doesn't slide: nothing about the three
 * lenses is to the left or right of another.
 */
const CONTENT =
  "text-sm outline-none animate-in fade-in-0 duration-150 motion-reduce:animate-none";

/**
 * Nothing in range is not the same as nothing at all, so it says which.
 *
 * An empty table of six zero rows is technically honest and reads as broken —
 * it's a lot of ink to say "no". A sentence naming the range points at the
 * control that would fix it.
 */
function Empty(props: { range: Range }) {
  const { range } = props;

  return (
    // Dashed, and now that is all it is: the box and the fill went with every
    // other panel's, and what says "this band is empty" is the rule being
    // broken rather than a frame drawn round a sentence. Same weight and same
    // colour as a real panel's rule, because this *is* a panel — it is the
    // Areas answer, in the case where the answer is "nothing".
    <div className={`${RULE} border-dashed px-10 py-16 text-center`}>
      <p className="text-ink-muted">{emptyMessage(range)}</p>
    </div>
  );
}

function emptyMessage(range: Range): string {
  // A half-drawn custom range isn't an empty result, it's an unfinished
  // question — so it gets an instruction rather than a verdict.
  if (range.kind === "custom" && (!range.from || !range.to)) {
    return "Pick a start and an end date to see what falls between them.";
  }
  // "All time" is empty exactly once: before the first sticker is ever placed.
  // That's the only case where the answer is elsewhere in the app.
  if (range.kind === "all") {
    return "No stickers placed yet. Drop one onto a day on the Calendar tab and it will show up here.";
  }
  return "Nothing placed in this range. Try a wider one.";
}
