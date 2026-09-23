"use client";

import { useSyncExternalStore } from "react";

import { today, type DayString } from "./dates";

/** Notify at local midnight, and after the tab returns from sleeping. */
function subscribe(onChange: () => void) {
  let timer = 0;

  function scheduleMidnight() {
    const now = new Date();
    const midnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
    );
    timer = window.setTimeout(() => {
      onChange();
      scheduleMidnight();
    }, midnight.getTime() - now.getTime() + 50);
  }

  scheduleMidnight();

  window.addEventListener("focus", onChange);
  document.addEventListener("visibilitychange", onChange);

  return () => {
    window.clearTimeout(timer);
    window.removeEventListener("focus", onChange);
    document.removeEventListener("visibilitychange", onChange);
  };
}

/** A hydration-safe local date that keeps advancing while the app stays open. */
export function useToday(serverSnapshot: DayString): DayString;
export function useToday(serverSnapshot: null): DayString | null;
export function useToday(serverSnapshot: DayString | null): DayString | null {
  return useSyncExternalStore(subscribe, today, () => serverSnapshot);
}
