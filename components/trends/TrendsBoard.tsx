"use client";

import { useMemo, useState, useSyncExternalStore } from "react";

import { Bars } from "./Bars";
import { ChartSwitcher } from "./ChartSwitcher";
import { Donut } from "./Donut";
import { LifeStar } from "./LifeStar";
import { RangePicker } from "./RangePicker";
import { MoodStrip, Readout } from "./Readout";
import {
  RANGE_LABEL,
  moodTally,
  rangePhrase,
  resolveBounds,
  takeaway,
  tally,
  type Bounds,
  type Range,
} from "@/lib/analytics";
import type { ChartKind } from "@/lib/charts";
import { formatDayShort, today, type DayString } from "@/lib/dates";
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
 * The Trends page: a range, and the numbers that fall inside it.
 *
 * The client/server seam is the same one Step 7 drew and every step since has
 * kept. `TrendsView` fetches; this draws. What's new is that the drawing side
 * now *computes* — the grouping happens here, in the browser, over data the page
 * already holds.
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

  /**
   * Which lens you're looking through. UI state for the same reason `range` is,
   * only more so — the range at least changes which numbers exist, and this
   * changes nothing but how they're drawn.
   *
   * Held here rather than inside a `Chart` component that switches on itself,
   * because the switcher and the chart are siblings on the page: the pill sits
   * above the card, not inside it. This is the lowest node that owns both.
   */
  const [chart, setChart] = useState<ChartKind>("star");

  const bounds = useMemo(
    () => resolveBounds(range, todayString),
    [range, todayString],
  );

  /**
   * The reason this is memoized isn't speed — six areas and a few hundred marks
   * is nothing. It's identity. This object becomes props for the table now and
   * for three charts in Steps 13 and 14, and a fresh object every render means
   * every one of them re-renders on every keystroke anywhere on the page.
   * `useMemo` is what lets the things below it be skippable.
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

  const span = spanLabel(range, bounds);

  /**
   * The range as an adverbial, used twice: once inside the takeaway sentence and
   * once in the mood heading. Computed here so the two can't drift into saying
   * "this month" and "across the month" about the same fortnight.
   */
  const phrase = rangePhrase(range);

  // Cheap, but it takes `totals` as input, so it re-derives on every render of
  // a component that re-renders on every keystroke in the date picker. Free to
  // memoize, and it keeps `Readout`'s props stable.
  const summary = useMemo(() => takeaway(totals, phrase), [totals, phrase]);

  return (
    // No PAGE_WIDTH here. `AppShell`'s <main> already carries it, and applying
    // it again would nest one max-width inside an identical one and pay the
    // horizontal padding twice — the page would look inset from itself.
    <div className="flex flex-col gap-5">
      <h1 className="font-heading text-page-title">
        Trends
      </h1>

      {/* Two columns: the picture on the left, what it says on the right.

          The controls moved *into* the left column, and that's the layout
          decision worth recording. They used to sit in a full-width header
          above the grid, which meant the right half of that band was empty and
          the readout began a whole control row lower than the page's first real
          content — the sentence, which is the answer, started below the
          picture's furniture. Now the grid's first row is "the range you picked"
          against "what it says", and the two columns start on the same line.

          The cost is honest and worth naming: the range picker governs both
          columns but now sits in one of them, so it reads a little like it only
          filters the chart. What keeps that from misleading is that everything
          on this page is the same range — there is nothing here it *doesn't*
          filter — and the dates beside it are the same dates the table is
          counting.

          `lg` and not `md`. The break is set by what the right column needs
          rather than by a device — a three-column table plus a wrapping mood
          strip stops being readable somewhere around 22rem, and at `md` each
          half is narrower than that. Below it they stack, controls and chart
          first, which is the reading order the page already has on a phone.

          `items-start` matters more than it looks: without it the grid stretches
          both columns to the taller one's height, and the chart card — which is
          a fixed ratio by design — would be pulled out of shape by however long
          the table happens to be. */}
      <section className="grid items-start gap-x-14 gap-y-10 lg:grid-cols-2">
        {/* `min-w-0` for the reason `Bars` needs it on its name cell: a grid
            column's default minimum is its content, and the card would
            otherwise refuse to shrink past its own contents' width and push the
            readout off the page. */}
        <div className="flex min-w-0 flex-col gap-4">
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
                className="tabular text-[0.9rem] text-ink-muted"
              >
                {span}
              </p>
            )}
          </div>

          {totals.total > 0 && (
            <>
              {/* The switcher sits above the card it changes, not inside it —
                  a control that redraws a panel belongs next to the panel, and
                  putting it in the card's own padding would make it look like
                  part of the chart. */}
              <ChartSwitcher value={chart} onChange={setChart} />

              {/* One tally, three lenses, and this is the line the Step 12/13
                  seam was built for: every chart below reads the same memoized
                  `totals` and none of them touches data code. Switching lens
                  re-renders one component and recomputes nothing.

                  Mounted one at a time rather than all three with two hidden.
                  Hidden charts would still be in the accessibility tree and in
                  the DOM, and Step 17 is going to animate this — a thing that
                  enters is far easier to animate than a thing that was always
                  there wearing `display: none`. */}
              {chart === "star" && <LifeStar tally={totals} />}
              {chart === "donut" && <Donut tally={totals} />}
              {chart === "bars" && <Bars tally={totals} />}
            </>
          )}
        </div>

        {totals.total === 0 ? (
          // Beside the control rather than across both tracks, which is what it
          // used to be. A lone sentence in half an empty page reads as something
          // that failed to load — but the other half isn't empty any more, it's
          // the dropdown that would fix this, and "no results" directly beside
          // "here's the filter" is the pairing that explains itself.
          <div className="flex flex-col gap-8">
            <Empty range={range} />

            {/* Moods survive an empty tally. A range can hold days you rated
                and never placed a sticker on, and those are still an answer to
                "how was this month" — hiding them because the chart has nothing
                to draw would throw away real data. */}
            {moods.total > 0 && <MoodStrip moods={moods} phrase={phrase} />}
          </div>
        ) : (
          <Readout
            tally={totals}
            moods={moods}
            takeaway={summary}
            caption={tableCaption(range, bounds)}
            phrase={phrase}
          />
        )}

        {/* Zero today, and it stays invisible while it is. It exists so that
            once something can archive a sticker, marks that stop being
            attributable say so instead of quietly leaving the total. */}
        {totals.unattributed > 0 && (
          <p className="text-[0.9rem] text-ink-muted lg:col-span-2">
            {totals.unattributed} mark{totals.unattributed === 1 ? "" : "s"} came
            from stickers that are no longer in your tray, so they aren&rsquo;t
            counted under any area.
          </p>
        )}

      </section>
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
    <div className="rounded-xl border border-dashed border-hairline bg-surface px-10 py-16 text-center">
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
