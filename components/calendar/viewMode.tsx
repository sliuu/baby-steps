"use client";

import { createContext, useContext } from "react";

import type { CalendarViewMode } from "./period";

/**
 * Which calendar the nav is asking for, carried past a server boundary.
 *
 * Month-or-week used to be a pill beside the arrows, owned by `CalendarBoard`
 * a few elements away from the thing it controlled. It's a top-nav section now
 * — Week, Month, Trends — which puts the state in `AppShell`, and `AppShell`
 * can't hand it down as a prop: the calendar reaches it as `props.calendar`, a
 * finished server-rendered node, and you cannot add a prop to a node you were
 * given. Context is the one channel that still works across that seam. The
 * provider is a Client Component, the consumer is a Client Component, and the
 * server-rendered markup in between simply passes it along.
 *
 * The default is `month` rather than a throw-if-missing, because a missing
 * provider here means someone rendered a calendar outside the shell — a test,
 * a story — and the honest answer for that case is the ordinary view, not a
 * crash. Note that it is a default for *no provider*, which is a different
 * thing from the `null` the type now admits: null comes from a provider that
 * is there and has nothing to report yet, because nobody has pressed a section
 * — see `LANDING_NARROW` in `lib/nav.ts`, and `CalendarPanel` for what the
 * calendar draws when it gets one.
 */
const ViewModeContext = createContext<CalendarViewMode | null>("month");

/**
 * The way back up. Tapping a day in the week list or the month grid should
 * *open* that day, and opening a day means changing a nav section two
 * components above this one — the same seam `ViewModeContext` crosses, in the
 * other direction.
 *
 * A second context rather than an object on the first, because the two have
 * different readerships and different re-render costs: every calendar reads
 * the view on every render, and exactly one of them ever needs the setter. A
 * `{ view, setView }` value would be a new object each render of the shell,
 * which is a re-render for all of them to deliver a function to one.
 *
 * The default is a no-op for the same reason the view defaults to `month`: a
 * calendar rendered outside the shell is a test or a story, and the honest
 * answer there is that tapping a day does nothing, not that it throws.
 */
const SetViewContext = createContext<(view: CalendarViewMode) => void>(
  () => {},
);

export function CalendarViewProvider(props: {
  /** Null until a section is pressed. See `LANDING_NARROW` in `lib/nav.ts`. */
  view: CalendarViewMode | null;
  /** Usually the shell's own `setPage`. The three view modes are three of its
   *  four pages, so it needs no adapter. */
  onChangeView: (view: CalendarViewMode) => void;
  children: React.ReactNode;
}) {
  return (
    <ViewModeContext value={props.view}>
      <SetViewContext value={props.onChangeView}>
        {props.children}
      </SetViewContext>
    </ViewModeContext>
  );
}

/**
 * Ask the nav for a different calendar. No hydration gate on this one — it is
 * a function, not a value, so there is no markup for it to disagree with, and
 * by the time anyone can press something the page has hydrated anyway.
 */
export function useSetCalendarView(): (view: CalendarViewMode) => void {
  return useContext(SetViewContext);
}

/**
 * Month grid, week strip or one day, as chosen in the top nav — or `null`,
 * meaning nobody has chosen yet and `CalendarPanel` should draw both landings.
 *
 * **There was a hydration gate here, and removing it is the point.** It held
 * the view at a hardcoded `month` until this subtree had hydrated, because the
 * shell used to measure the window on its first client render and switch a
 * phone to Today immediately — and the calendar sits behind its own
 * `<Suspense>`, streamed from the server, so a context change arriving before
 * that boundary hydrated meant React trying to match a day view onto a month's
 * markup. It threw and rebuilt the tree.
 *
 * Nothing changes the section between the server render and hydration any
 * more: the shell starts at `null` and stays there until a press, which cannot
 * happen before the page is interactive. So the gate has no event left to
 * absorb — and keeping it would now *cause* the flash it was written to
 * prevent, by forcing `month` over the null that both landings depend on.
 */
export function useCalendarView(): CalendarViewMode | null {
  return useContext(ViewModeContext);
}
