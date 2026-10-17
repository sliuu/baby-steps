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
 * No provider (tests, stories) → `month`. Null from a provider → nothing
 * pressed yet; `CalendarPanel` draws `LANDING_VIEW`.
 */
const ViewModeContext = createContext<CalendarViewMode | null>("month");

/** Hydration status without an effect-driven setState. */
const noSubscription = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

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
  /** Null until a section is pressed; draws `LANDING_VIEW`. */
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
 * The hydration gate is load-bearing because this subtree is streamed behind
 * Suspense. AppShell restores a URL such as `#week` in its own effect, which
 * can run after the shell hydrates but before this later boundary does. Reading
 * that new context value during the boundary's first client render would try
 * to match one Week section against the server's two responsive landing
 * sections and React would discard the tree. Holding `null` through this
 * boundary's hydration makes its first render match the server; the URL-backed
 * view takes over immediately afterwards.
 */
export function useCalendarView(): CalendarViewMode | null {
  const view = useContext(ViewModeContext);
  const hydrated = useSyncExternalStore(
    noSubscription,
    clientSnapshot,
    serverSnapshot,
  );
  return hydrated ? view : null;
}
