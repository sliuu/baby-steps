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

import { MonthDots } from "./MonthDots";
import { MonthGrid } from "./MonthGrid";
import { PeriodHeader } from "./PeriodHeader";
import { TodayView } from "./TodayView";
import { WeekGrid } from "./WeekGrid";
import { WeekList } from "./WeekList";
import { useSetCalendarView } from "./viewMode";
import {
  LANDING_NARROW_VIEW,
  LANDING_WIDE_VIEW,
  type CalendarViewMode,
  type PeriodProps,
} from "./period";
import type { LibraryGroup } from "@/lib/queries/activities";
import {
  formatMonthTitle,
  formatWeekTitle,
  fromDayString,
  stepMonth,
  stepWeek,
  today,
  toMonthString,
  toWeekString,
} from "@/lib/dates";
import { cn } from "@/lib/utils";

type Props = Omit<PeriodProps, "todayString"> & {
  /**
   * "2026-09" — the server's own day, and the anchor until the browser has a
   * better one.
   *
   * It used to be a month, and the day view is what made that untenable. A
   * month is enough to draw a month grid: anchoring on the 1st and correcting
   * to the 17th once the browser reports in changes which cell wears the ring
   * and nothing else. The day view *is* the anchor — masthead, week strip,
   * stickers, note — so the same handoff redrew the entire screen from the 1st
   * of the month to today, a second in, which is the flash this fixes.
   *
   * The residue is honest and much smaller. The server's day is the server's
   * timezone, so a visitor far enough west of it sees the date step back by
   * one once `todayString` lands — an evening-only, one-day correction instead
   * of an always, up-to-thirty-day one. Removing even that needs the browser's
   * timezone on the server, which means a cookie and a first visit that still
   * guesses.
   */
  initialDay: string;
  /**
   * The sticker library: the day view's picker, and the phone month's areas.
   *
   * Deliberately not in `PeriodProps`, and the reason has survived a second
   * tenant. The grids draw the stickers that are *on* the days they show and
   * have no business knowing what else exists; the two places that need the
   * catalogue need it for something other than drawing a day. The day view is
   * where you add from. `MonthDots` counts areas touched, and a placement
   * carries its hue but not the area it came from — the map from one to the
   * other only exists here.
   */
  groups: LibraryGroup[];
  /**
   * Which view is showing. It arrives from `CalendarBoard`, which reads it off
   * the top nav — the panel neither owns it nor changes it. There is nothing in
   * here to change it *with* any more: Week and Month are nav sections now, and
   * the pill that used to sit beside the arrows is gone.
   *
   * **Null means nobody has pressed a section yet**, and it is not the same as
   * "month". A cold load lands on the day on a phone and the month on a laptop,
   * and the server cannot tell which — so null draws both and lets CSS pick.
   * See `LANDING_NARROW` in `lib/nav.ts`.
   */
  view: CalendarViewMode | null;
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

  const setView = useSetCalendarView();

  // Null until an arrow is pressed. While it's null the calendar follows the
  // clock, so a visitor who leaves the tab open overnight isn't stranded in
  // last month.
  const [chosenDay, setChosenDay] = useState<Date | null>(null);

  const anchor = useMemo(() => {
    if (chosenDay) return chosenDay;
    // The browser's own date the moment it has one, and the server's until
    // then — see `initialDay`. Note that this is the only thing the server's
    // guess is allowed to decide: `todayString` stays null through hydration,
    // so no cell is *ringed* as today until the browser has confirmed which
    // day that is. Where you are looking can be approximated; which day it
    // actually is cannot.
    return fromDayString(todayString ?? props.initialDay);
  }, [chosenDay, todayString, props.initialDay]);

  /**
   * Open one day, from the week list or the month grid.
   *
   * Two things at once, and they belong together: move the anchor, then ask
   * the nav for the day view. The anchor is this component's own state and the
   * section is the shell's, which is why the second half arrives through a
   * context — see `useSetCalendarView`. Nothing in here can tell whether the
   * view actually changed, and it doesn't need to: at a wide window the taps
   * that call this don't exist.
   */
  const showDay = (day: Date) => {
    setChosenDay(day);
    setView("today");
  };

  const month = useMemo(() => startOfMonth(anchor), [anchor]);

  // Named one by one rather than spread from `props`, which also carries
  // `view` and `initialDay` — two things a grid has no business seeing. A
  // JSX spread is not excess-property checked, so those would arrive silently.
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

  /**
   * One calendar, drawn for one view.
   *
   * A function rather than the component's own return, because a cold load has
   * to draw *two* — the phone's landing and the desktop's — and hide one with
   * CSS. Everything below the anchor is derived from the view it is handed, so
   * asking for a second drawing costs nothing but the markup: the title, the
   * period key and the arrows' unit are all recomputed from `view`, and the
   * anchor and the day state they read are shared, which is what keeps the two
   * drawings agreeing about where you are looking.
   */
  const body = (view: CalendarViewMode, className?: string) => {
    // The day view draws its own masthead and steps by tapping a date in its
    // own strip, so it takes neither the period header nor the deck transition
    // — it shares only the anchor, which is what keeps "where you were
    // looking" intact when you switch to Week or Month and back.
    if (view === "today") {
      return (
        <TodayView
          className={className}
          anchor={anchor}
          onPickDay={setChosenDay}
          groups={props.groups}
          {...passthrough}
        />
      );
    }

    const week = view === "week";
    const title = week ? formatWeekTitle(anchor) : formatMonthTitle(month);
    // The key React watches to decide there is something to animate between.
    // It carries the view as well as the period, so switching Month to Week is
    // a swap rather than a morph of one grid into the other.
    const periodKey = week
      ? `week:${toWeekString(anchor)}`
      : `month:${toMonthString(month)}`;

    /**
     * Step a period, and tell the browser which way we went.
     *
     * Three things have to be true for the deck animation to run, and each of
     * them is easy to lose:
     *
     * 1. `startTransition`. `<ViewTransition>` only participates in
     *    transitions — a bare `setState` swaps the grids with no animation at
     *    all, and there is no warning when it does.
     *
     * 2. `addTransitionType`, because direction cannot be a prop. React reads
     *    the *exit* animation off the outgoing grid, and the outgoing grid
     *    rendered before you clicked anything, so its props can't know which
     *    arrow you just pressed. A transition type is metadata on the update
     *    itself, which both sides can see.
     *
     * 3. A changed `key` and no `name`. With a name, React treats the two
     *    grids as the same element and morphs one into the other. Without one,
     *    it sees an unmount and a mount — the enter/exit pair the deck needs.
     *
     * The types are `step-*` rather than `month-*`: direction is the only
     * thing they carry, and a week travels the same 8% sideways for the same
     * reason.
     */
    const step = (by: number) => {
      startTransition(() => {
        addTransitionType(by > 0 ? "step-next" : "step-previous");
        setChosenDay(week ? stepWeek(anchor, by) : stepMonth(month, by));
      });
    };

    return (
      <section
        // `cn` and not a template string, because the class this merges into
        // is `flex` and the class arriving is `hidden`. Both set `display`, so
        // the winner would otherwise be whichever Tailwind happened to emit
        // last in the stylesheet — `twMerge` makes it the later argument here.
        className={cn("flex flex-col gap-6", className)}
        data-period={periodKey}
      >
        <PeriodHeader title={title} view={view} onStep={step} />

        {/* `default="none"` is load-bearing, not tidiness. Every sticker change
            in this app commits inside a `startTransition` — see
            `CalendarBoard.commit` — and a `<ViewTransition>` with no default
            animates on *any* transition that touches it. Without this, dropping
            a sticker on a Tuesday would slide the whole month sideways. */}
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
          {/* **Both drawings ship, and CSS picks between them.** The obvious
              alternative is a width hook, and it was built that way first. It
              cannot work: the server has no window to measure, so a hook has to
              guess, render the guess, and correct it once the browser has
              hydrated — which is a visible flash of the desktop grid on exactly
              the device the phone views exist for. No third argument to
              `useSyncExternalStore` fixes that; guessing narrow only moves the
              flash to the desktop. CSS is the only thing in the stack that
              knows the width before the first paint.

              The price is bytes, and it is lopsided. Measured on `/demo`, a
              dense month grid is 212KB of markup that a phone now downloads and
              never shows; the dot grid going the other way costs a desktop
              27KB. So the trade is really "a phone pays for the desktop's
              drawing", in exchange for never showing it the wrong one — the
              same bargain `BottomNav` and the nav pill already make, with a
              much heavier hidden half.

              The single wrapper is not tidiness either. `<ViewTransition>`
              names the DOM node underneath it, and handing it two siblings
              makes the deck animation a question about which of them is
              showing. One node travels, and the pair inside it is none of the
              transition's business. */}
          <div>
            {week ? (
              <>
                <WeekList
                  className="lg:hidden"
                  anchor={anchor}
                  onShowDay={showDay}
                  {...passthrough}
                />
                <WeekGrid
                  className="hidden lg:block"
                  anchor={anchor}
                  {...passthrough}
                />
              </>
            ) : (
              <>
                <MonthDots
                  className="lg:hidden"
                  month={month}
                  groups={props.groups}
                  onShowDay={showDay}
                  {...passthrough}
                />
                <MonthGrid
                  className="hidden lg:block"
                  month={month}
                  {...passthrough}
                />
              </>
            )}
          </div>
        </ViewTransition>
      </section>
    );
  };

  /**
   * Nothing pressed yet, so draw both landings and let CSS choose — the same
   * bargain the week and the month strike one level down, one level up.
   *
   * It is the heaviest instance of it in the app: the phone's landing is the
   * day view, which carries the whole sticker picker, and the desktop's is a
   * month grid. A cold load ships both. The alternative is the flash, and a
   * section changing under the reader a second into the page is worse than
   * markup they never see.
   *
   * Two `<section>`s side by side rather than one wrapper with both inside,
   * because the wrapper would be a box around a page-level section for no
   * reason anyone reading the DOM could reconstruct.
   *
   * `lg:flex` and not `lg:block`, which is the one detail here that bites.
   * `twMerge` sees `hidden` arrive against the section's own `flex` and drops
   * the `flex`, as it should — so the class that turns the section back *on*
   * above 64rem has to be the display it actually wants, or the month lands on
   * a block container where `flex-col` and `gap-6` mean nothing and the header
   * sits flush against the grid.
   */
  if (props.view === null) {
    return (
      <>
        {body(LANDING_NARROW_VIEW, "lg:hidden")}
        {body(LANDING_WIDE_VIEW, "hidden lg:flex")}
      </>
    );
  }

  return body(props.view);
}
