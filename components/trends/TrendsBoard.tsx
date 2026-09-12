"use client";

import { useMemo, useState, useSyncExternalStore } from "react";

import { HabitHeatmap } from "./HabitHeatmap";
import { LifeStar } from "./LifeStar";
import { MoodLine } from "./MoodLine";
import { MostDone } from "./MostDone";
import { RangePicker } from "./RangePicker";
import { MoodStrip, Readout } from "./Readout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  RANGE_LABEL,
  activityTally,
  moodSeries,
  moodTakeaway,
  moodTally,
  rangePhrase,
  resolveBounds,
  takeaway,
  tally,
  type Bounds,
  type Range,
} from "@/lib/analytics";
import { formatDayShort, today, type DayString } from "@/lib/dates";
import { HEATMAP_DAYS, dayWindow, heatmap } from "@/lib/heatmap";
import { RULE } from "@/lib/layout";
import type { LibraryGroup } from "@/lib/queries/activities";
import type { StickersByDay } from "@/lib/stickers";

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

/** Today doesn't change mid-session, so there's nothing to subscribe to. */
const noSubscription = () => () => {};

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
  const todayString = useSyncExternalStore(
    noSubscription,
    () => today(),
    () => props.initialToday,
  );

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
    () => tally(props.stickersByDay, props.groups, bounds),
    [props.stickersByDay, props.groups, bounds],
  );

  /**
   * A second pass over the same map, memoized for the same reason `totals` is.
   * Separate from `tally` because they count different units — placements
   * against days — see the note on `moodTally`.
   */
  const moods = useMemo(
    () => moodTally(props.stickersByDay, bounds),
    [props.stickersByDay, bounds],
  );

  /**
   * The same days again, keeping the dates this time. `moodTally` counts how
   * many days felt each way and deliberately throws the calendar out, which is
   * the axis a line needs — so it's a separate walk rather than a wider return
   * shape that every caller would take half of.
   */
  const series = useMemo(
    () => moodSeries(props.stickersByDay, bounds),
    [props.stickersByDay, bounds],
  );

  /**
   * The habit ranking. A third walk over the same map, at the grain the marks
   * were placed at rather than rolled up to areas — see `activityTally`.
   */
  const ranking = useMemo(
    () => activityTally(props.stickersByDay, bounds),
    [props.stickersByDay, bounds],
  );

  /**
   * The rolling eight weeks, which is the one thing on this page `bounds`
   * doesn't touch. Keyed on `todayString` alone, so switching range doesn't
   * rebuild the same window to arrive at the same answer.
   *
   * Still computed while you're on another tab, deliberately. It's a few dozen
   * marks bucketed into arrays — cheaper than the re-render that deferring it
   * would cost — and keeping it out of the tab's own render is what lets Radix
   * mount the Habits panel without a frame of empty strip.
   */
  const days = useMemo(
    () => dayWindow(todayString, HEATMAP_DAYS),
    [todayString],
  );

  const rows = useMemo(
    () => heatmap(props.stickersByDay, props.groups, days),
    [props.stickersByDay, props.groups, days],
  );

  const span = spanLabel(range, bounds);

  /**
   * The range as an adverbial, used on all three tabs: inside the takeaway
   * sentence, in the ranking's heading and in the mood heading. Computed here
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

  return (
    // No PAGE_WIDTH here. `AppShell`'s <main> already carries it, and applying
    // it again would nest one max-width inside an identical one and pay the
    // horizontal padding twice — the page would look inset from itself.
    <div className="flex flex-col gap-5">
      <h1 className="font-heading text-page-title">
        Trends
      </h1>

      <Tabs
        value={tab}
        onValueChange={(next) => setTab(next as TrendsTab)}
        // The root is `flex flex-col gap-2`, which is a gap for tabs inside a
        // popover. A page's panels need the same air the sections around them
        // have.
        className="gap-8"
      >
        {/* One band: which lens on the left, which range on the right.

            The range picker governs all three tabs, so it stays outside them —
            moving it inside would mean three copies of one control, or a
            control that appears to reset when you switch. Sharing a line with
            the tabs is what says "this applies to whichever of these you're
            on". The one thing it doesn't filter is the year strip, which
            answers that itself: the strip prints its own dates and says so in
            words.

            `justify-between` with `flex-wrap`: on a narrow screen the range
            drops to its own line under the tabs rather than squeezing them. */}
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          {/* `variant="line"` — underlined, not the nav's pill, and that is the
              decision here rather than a default. Step 15's week entry records
              why the Month/Week pill left the calendar: two segmented pills on
              one screen read as two levels of navigation and you have to
              remember which one holds what. The nav owns the pill. Sections
              *within* a page get an underline, which is the same distinction
              `MarkPicker` already draws inside its popover. */}
          <TabsList variant="line">
            {TABS.map((entry) => (
              <TabsTrigger
                key={entry.id}
                value={entry.id}
                // Bumped off the component's `text-sm`, which is sized for
                // eight icon tabs in a popover. These sit under a 3rem page
                // title and are the page's primary control.
                className="px-3 text-[0.95rem]"
              >
                {entry.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <RangePicker value={range} onChange={setRange} />

            {/* The dates the rule resolved to, right where the rule is set. The
                dropdown says what you picked; this says what that means today,
                and the pair is only useful side by side — a rule and its
                resolution separated by a heading is two facts you have to hold
                at once. */}
            {span && (
              <p
                // The dates change when the dropdown changes but the dropdown
                // doesn't announce them, so a screen reader would hear the new
                // rule and never the new period.
                aria-live="polite"
                className="tabular text-[0.83rem] text-ink-muted"
              >
                {span}
              </p>
            )}
          </div>
        </div>

        {/* Areas — the six life areas, as a shape and as a table. */}
        <TabsContent value="areas">
          {totals.total === 0 ? (
            <Empty range={range} />
          ) : (
            // Two columns: the picture on the left, what it says on the right.
            //
            // `lg` and not `md`. The break is set by what the right column
            // needs rather than by a device — a three-column table stops being
            // readable somewhere around 22rem, and at `md` each half is
            // narrower than that. Below it they stack, chart first, which is
            // the reading order the page already has on a phone.
            //
            // `items-start` matters more than it looks: without it the grid
            // stretches both columns to the taller one's height, and the chart
            // card — which is a fixed ratio by design — would be pulled out of
            // shape by however long the table happens to be.
            <div className="grid items-start gap-x-14 gap-y-10 lg:grid-cols-2">
              {/* `min-w-0` for the reason `MostDone` needs it on its name cell:
                  a grid column's default minimum is its content, and the card
                  would otherwise refuse to shrink past its own contents' width
                  and push the readout off the page. */}
              <div className="min-w-0">
                <LifeStar tally={totals} />
              </div>

              <Readout
                tally={totals}
                takeaway={summary}
                caption={tableCaption(range, bounds)}
              />

              {/* Zero today, and it stays invisible while it is. It exists so
                  that once something can archive a sticker, marks that stop
                  being attributable say so instead of quietly leaving the
                  total. On this tab and not the others because it is a fact
                  about *attribution to an area* — the ranking and the strip
                  read habits off the placement and never needed the library to
                  name them. */}
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
        </TabsContent>

        {/* Habits — the same marks at the grain they were placed at, twice
            over: ranked for the range, and spread across the last eight weeks
            one row per habit. Which you did most, and when you did it.

            **Side by side once there's room, stacked at one width when there
            isn't.** They were stacked full-bleed, the ranking capped at
            `max-w-2xl` and the strip running the whole page — two panels of
            different widths about the same habits, with a scroll between them.
            A grid puts them in one row above `xl` and in one column below it,
            and in the stacked case both cards are the column, so neither is
            arbitrarily narrower than the other.

            The split is `20rem` and the rest, not two halves. A ranking is a
            list of short names with bars behind them and it stops improving
            past about twenty characters; the strip is 574px of fixed-pitch
            squares that either fits or scrolls. So the narrow one is pinned to
            what it needs and the wide one takes what's left — which is also
            what lets `HabitHeatmap`'s geometry be budgeted against a number
            rather than a guess.

            `xl` and not `lg`, because the arithmetic says so: 20rem plus the
            gap plus the strip's 574px and its card padding is about 1070px of
            content, which is what `max-w-6xl` gives at an `xl` viewport and
            more than `lg` has. */}
        <TabsContent value="habits">
          <div
            className={`grid items-start gap-x-8 gap-y-10 ${
              ranking.activities.length === 0
                ? ""
                : "xl:grid-cols-[20rem_minmax(0,1fr)]"
            }`}
          >
            {ranking.activities.length === 0 ? (
              // Not the full `Empty` card. The tab isn't empty — the strip
              // still covers the last eight weeks — so a dashed box announcing
              // nothing would be contradicted by the thing next to it. It also
              // drops the grid back to one column: a sentence doesn't need a
              // 20rem track, and the strip gets the whole width instead.
              <p className="text-ink-muted">
                Nothing placed {phrase}, so there is no ranking to draw. The
                strip covers the last eight weeks either way.
              </p>
            ) : (
              <MostDone ranking={ranking} phrase={phrase} />
            )}

            <HabitHeatmap rows={rows} days={days} />
          </div>
        </TabsContent>

        {/* Moods — days, not marks, which is exactly why they get their own
            tab rather than a corner of the Areas one. They were the last thing
            in the right-hand column, under a table of a different unit, and
            being third in a stack is how a five-item answer gets missed. */}
        <TabsContent value="moods">
          {/* The line first, the distribution second, and the order is the
              argument for having both. The line answers "which way is this
              going" and says nothing about how often you felt any one way; the
              strip answers "how many rough days" and says nothing about when.
              Neither is a summary of the other, so neither is redundant — which
              is the test the deleted donut failed. */}
          <div className="flex flex-col gap-10">
            <MoodLine series={series} takeaway={drift} />
            <MoodStrip moods={moods} phrase={phrase} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * The dates beside the dropdown, or null when there's nothing to add.
 *
 * Null in exactly two cases, both of them "the control already said it". "All
 * time" has no edges to print, and its own label is the complete answer. A
 * custom range prints its dates on the popover button itself, so repeating them
 * two inches to the right is the same string twice.
 *
 * So this earns its place only for the fixed ranges, which are the ones whose
 * label is a *rule* — "This month" doesn't tell you it means the 1st to the
 * 22nd, and that's the number you'd want to check against the calendar.
 */
function spanLabel(range: Range, bounds: Bounds): string | null {
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
 * The table's accessible name. Never drawn — see the prop's note in `AreaTable`.
 *
 * Says more than `spanLabel` deliberately: on screen the rule and the dates sit
 * beside each other and the table is directly below them, so proximity does the
 * work. A screen reader entering the table has left all of that behind, so this
 * has to be self-contained.
 */
function tableCaption(range: Range, bounds: Bounds): string {
  const where = spanLabel(range, bounds);
  if (range.kind === "custom" && bounds.from && bounds.to) {
    return `Marks by life area, ${formatDayShort(bounds.from)} to ${formatDayShort(bounds.to)}`;
  }
  return where
    ? `Marks by life area, ${RANGE_LABEL[range.kind]}: ${where}`
    : `Marks by life area, ${RANGE_LABEL[range.kind]}`;
}

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
