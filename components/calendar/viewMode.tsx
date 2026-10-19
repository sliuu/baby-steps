"use client";

import { createContext, useContext, useSyncExternalStore } from "react";

import type { CalendarViewMode } from "./period";

/**
 * Calendar view from the top nav. Context, since `AppShell` can't add props to
 * the server-rendered calendar node. No provider → `month`; null → landing.
 */
const ViewModeContext = createContext<CalendarViewMode | null>("month");

/** Hydration status without an effect-driven setState. */
const noSubscription = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

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
 * Chosen view, or null (draw both landings). Holds null until hydrated: the
 * subtree streams behind Suspense, and AppShell may restore `#week` first,
 * which would mismatch the server's landing markup.
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
