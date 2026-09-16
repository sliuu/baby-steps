"use client";

import { createContext, useContext, useSyncExternalStore } from "react";

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
 * crash. It is the same `month` the server always renders, which is the next
 * comment's whole subject.
 */
const ViewModeContext = createContext<CalendarViewMode>("month");

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

/**
 * What the server drew, and therefore what the browser must hydrate against.
 *
 * The shell has no width on the server, so `useSection` lands on the month and
 * the markup that reaches the browser is a month grid — every time, for every
 * visitor, phone or laptop.
 */
const SERVER_VIEW: CalendarViewMode = "month";

/** The view never changes on its own; there is nothing to subscribe to. */
const noSubscription = () => () => {};

export function CalendarViewProvider(props: {
  view: CalendarViewMode;
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
 * Month grid, week strip or one day, as chosen in the top nav — but not until
 * this subtree has hydrated.
 *
 * **The gate is the load-bearing half, and it fixes a real hydration failure.**
 * The shell measures the window on its first client render and, on a phone,
 * switches the section to Today immediately. The calendar it is switching sits
 * behind its own `<Suspense>`, streamed in from the server, and a boundary that
 * has not hydrated yet still hydrates against *the HTML that arrived* — which
 * is a month grid. A context change reaching it first means React tries to
 * match a day view onto a month's markup, throws, and rebuilds the whole tree
 * on the client. Which is also why the fix cannot live in the provider: the
 * provider hydrates with the shell, early, and it is precisely that early
 * render that this boundary must not see.
 *
 * So the consumer holds `SERVER_VIEW` until its own hydration is done, exactly
 * as `CalendarPanel` holds `todayString` at null — `useSyncExternalStore`'s
 * third argument is the value for the server *and* for hydration, and React
 * re-renders with the real one on the commit straight after. The nav has
 * already moved by then, so the first thing a phone paints is a month grid and
 * the second is the day. One frame, and it is the same frame the section
 * switch was always going to cost.
 */
export function useCalendarView(): CalendarViewMode {
  const view = useContext(ViewModeContext);

  const hydrated = useSyncExternalStore(
    noSubscription,
    () => true, // browser, after hydration: the nav's answer is safe to use
    () => false, // server and hydration: only the markup that exists
  );

  return hydrated ? view : SERVER_VIEW;
}
