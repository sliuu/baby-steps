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
 * **There was a second context here, and the day sheet removed it.**
 *
 * `SetViewContext` carried a setter *up* the same seam this one carries the
 * view down: tapping a day in the week list or the month dots changed a nav
 * section two components above the calendar, so that the tap landed you on the
 * whole Today screen. It had exactly one consumer, `CalendarPanel.showDay`.
 *
 * Tapping a day now opens a sheet over the week you were reading — see
 * `DaySheet` — which is a better answer to the same gesture and needs no
 * setter, because nothing navigates. The context, its `useSetCalendarView`
 * hook and the provider's `onChangeView` prop all lost their last reader at
 * once, so they went together rather than being left as a channel nobody
 * sends on.
 *
 * What is genuinely gone: there is no longer any way for the calendar to ask
 * the nav for a different section. If something ever needs one again, it is a
 * context with one consumer and this is roughly what it looked like.
 */

export function CalendarViewProvider(props: {
  /** Null until a section is pressed. See `LANDING_NARROW` in `lib/nav.ts`. */
  view: CalendarViewMode | null;
  children: React.ReactNode;
}) {
  return (
    <ViewModeContext value={props.view}>{props.children}</ViewModeContext>
  );
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
