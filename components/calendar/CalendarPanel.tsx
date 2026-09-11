"use client";

import {
  addTransitionType,
  startTransition,
  useMemo,
  useState,
  useSyncExternalStore,
  ViewTransition,
} from "react";
import { startOfMonth } from "date-fns";

import { MonthGrid } from "./MonthGrid";
import { PeriodHeader } from "./PeriodHeader";
import { WeekGrid } from "./WeekGrid";
import type { CalendarViewMode, PeriodProps } from "./period";
import {
  formatMonthTitle,
  formatWeekTitle,
  fromDayString,
  fromMonthString,
  stepMonth,
  stepWeek,
  today,
  toMonthString,
  toWeekString,
} from "@/lib/dates";

type Props = Omit<PeriodProps, "todayString"> & {
  /** "2026-08", computed on the server so first paint isn't blank. */
  initialMonth: string;
  /**
   * Which view is showing. It arrives from `CalendarBoard`, which reads it off
   * the top nav — the panel neither owns it nor changes it. There is nothing in
   * here to change it *with* any more: Week and Month are nav sections now, and
   * the pill that used to sit beside the arrows is gone.
   */
  view: CalendarViewMode;
};

/** Today never changes mid-session, so there is nothing to subscribe to. */
const noSubscription = () => () => {};

/**
 * Owns one piece of state: which day you're looking at. Everything visible is
 * *derived* from it — the month around it, the week around it, the title, the
 * cells — and never stored alongside it, because two things that must agree
 * eventually won't.
 *
 * **One anchor for both views, and that is the whole design.** The month grid
 * used to hold a `Date` pinned to the first of a month; a week strip holding
 * its own Sunday beside it would be a second source of truth for "when", and
 * switching views would either lose your place or need code to reconcile the
 * two. A single day answers both questions: the month view shows the month
 * containing it, the week view shows the week containing it. Arrow through to
 * December and press Week, and you get the week containing 1 December — which
 * is where you were looking.
 *
 * The awkward part is the clock. This component renders twice: once on the
 * server, then again in the browser to hydrate. Reading `new Date()` during
 * render would let those two runs disagree — a server in UTC and a browser in
 * California are on different dates for seven hours out of every day — and
 * React would hydrate against markup that doesn't match.
 *
 * `useSyncExternalStore` exists for exactly this. Its third argument is the
 * value to use on the server *and during hydration*; the second is the real
 * client value, which React switches to immediately afterwards. So the first
 * paint is deliberately today-less, and no cell is wrongly marked.
 */
export function CalendarPanel(props: Props) {
  const todayString = useSyncExternalStore(
    noSubscription,
    () => today(), // browser: the visitor's own date
    () => null, // server and hydration: we don't know yet
  );

  // Null until an arrow is pressed. While it's null the calendar follows the
  // clock, so a visitor who leaves the tab open overnight isn't stranded in
  // last month.
  const [chosenDay, setChosenDay] = useState<Date | null>(null);

  const anchor = useMemo(() => {
    if (chosenDay) return chosenDay;
    // The server knows the month but not the visitor's day, so it anchors on
    // the first. The browser corrects to today on the very next render, which
    // is the same handoff `todayString` makes above.
    return todayString
      ? fromDayString(todayString)
      : fromMonthString(props.initialMonth);
  }, [chosenDay, todayString, props.initialMonth]);

  const week = props.view === "week";
  const month = useMemo(() => startOfMonth(anchor), [anchor]);

  const title = week ? formatWeekTitle(anchor) : formatMonthTitle(month);
  // The key React watches to decide there is something to animate between. It
  // carries the view as well as the period, so switching Month to Week is a
  // swap rather than a morph of one grid into the other.
  const periodKey = week
    ? `week:${toWeekString(anchor)}`
    : `month:${toMonthString(month)}`;

  /**
   * Step a period, and tell the browser which way we went.
   *
   * Three things have to be true for the deck animation to run, and each of
   * them is easy to lose:
   *
   * 1. `startTransition`. `<ViewTransition>` only participates in transitions —
   *    a bare `setState` swaps the grids with no animation at all, and there
   *    is no warning when it does.
   *
   * 2. `addTransitionType`, because direction cannot be a prop. React reads the
   *    *exit* animation off the outgoing grid, and the outgoing grid rendered
   *    before you clicked anything, so its props can't know which arrow you
   *    just pressed. A transition type is metadata on the update itself, which
   *    both sides can see.
   *
   * 3. A changed `key` and no `name`. With a name, React treats the two grids
   *    as the same element and morphs one into the other. Without one, it sees
   *    an unmount and a mount — the enter/exit pair the deck needs.
   *
   * The types are `step-*` rather than `month-*`: direction is the only thing
   * they carry, and a week travels the same 8% sideways for the same reason.
   */
  const step = (by: number) => {
    startTransition(() => {
      addTransitionType(by > 0 ? "step-next" : "step-previous");
      setChosenDay(week ? stepWeek(anchor, by) : stepMonth(month, by));
    });
  };

  // Named one by one rather than spread from `props`, which also carries
  // `view` and `initialMonth` — two things a grid has no business seeing. A JSX spread is not excess-property checked, so those
  // would arrive silently.
  const passthrough: PeriodProps = {
    stickersByDay: props.stickersByDay,
    onOpenDay: props.onOpenDay,
    onCommit: props.onCommit,
    highlight: props.highlight,
    target: props.target,
    caret: props.caret,
    landed: props.landed,
    todayString,
  };

  return (
    <section className="flex flex-col gap-6" data-period={periodKey}>
      <PeriodHeader title={title} view={props.view} onStep={step} />

      {/* `default="none"` is load-bearing, not tidiness. Every sticker change
          in this app commits inside a `startTransition` — see
          `CalendarBoard.commit` — and a `<ViewTransition>` with no default
          animates on *any* transition that touches it. Without this, dropping a
          sticker on a Tuesday would slide the whole month sideways. */}
      <ViewTransition
        key={periodKey}
        enter={{
          "step-next": "deck-next",
          "step-previous": "deck-previous",
          default: "none",
        }}
        exit={{
          "step-next": "deck-next",
          "step-previous": "deck-previous",
          default: "none",
        }}
        default="none"
      >
        {week ? (
          <WeekGrid anchor={anchor} {...passthrough} />
        ) : (
          <MonthGrid month={month} {...passthrough} />
        )}
      </ViewTransition>
    </section>
  );
}
