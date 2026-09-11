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
 * crash.
 */
const ViewModeContext = createContext<CalendarViewMode>("month");

export function CalendarViewProvider(props: {
  view: CalendarViewMode;
  children: React.ReactNode;
}) {
  return (
    <ViewModeContext value={props.view}>{props.children}</ViewModeContext>
  );
}

/** Month grid or week strip, as chosen in the top nav. */
export function useCalendarView(): CalendarViewMode {
  return useContext(ViewModeContext);
}
