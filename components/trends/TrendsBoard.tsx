"use client";

import { useMemo, useState, useSyncExternalStore } from "react";

import { AreaTable } from "./AreaTable";
import { LifeStar } from "./LifeStar";
import { RangePicker } from "./RangePicker";
import {
  RANGE_LABEL,
  resolveBounds,
  tally,
  type Bounds,
  type Range,
} from "@/lib/analytics";
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

  const span = spanLabel(range, bounds);

  return (
    // No PAGE_WIDTH here. `AppShell`'s <main> already carries it, and applying
    // it again would nest one max-width inside an identical one and pay the
    // horizontal padding twice — the page would look inset from itself.
    <div className="flex flex-col gap-8">
      {/* The range control sits under the title, left-aligned with it, rather
          than opposite it across the page. Pushed to the far right it reads as
          page furniture — the same slot the nav's controls occupy — when it is
          actually the first thing you set before reading anything below. Under
          the heading and above the numbers, it sits in the order you use it. */}
      <header className="flex flex-col items-start gap-5">
        <h1 className="font-heading text-5xl font-medium tracking-tight">
          Trends
        </h1>

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
      </header>

      {/* Wide enough to read, not so wide the eye loses the row it's on. Three
          columns of short values don't need the whole page.

          Step 15 turns this into two columns — the chart card on the left, the
          readout on the page ground to its right. Stacked for now, because the
          column split is that step's subject and guessing at it here would mean
          building the layout twice. */}
      <section className="flex max-w-2xl flex-col gap-8">
        {totals.total === 0 ? (
          <Empty range={range} />
        ) : (
          <>
            {/* Same `totals` object the table reads. Three charts will share it
                by Step 14, which is what the `useMemo` above is protecting —
                one tally, several lenses, no recomputation per lens. */}
            <LifeStar tally={totals} />
            <AreaTable tally={totals} caption={tableCaption(range, bounds)} />
          </>
        )}

        {/* Zero today, and it stays invisible while it is. It exists so that
            once something can archive a sticker, marks that stop being
            attributable say so instead of quietly leaving the total. */}
        {totals.unattributed > 0 && (
          <p className="mt-4 text-[0.9rem] text-ink-muted">
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
