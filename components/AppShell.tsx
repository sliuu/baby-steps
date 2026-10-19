"use client";

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { BottomNav } from "./BottomNav";
import { SettingsProvider } from "./SettingsProvider";
import { TopNav } from "./TopNav";
import { PageFrame } from "@/components/ui/PageFrame";
import { CalendarDataProvider } from "@/components/calendar/calendarData";
import { CalendarViewProvider } from "@/components/calendar/viewMode";
import { PAGE_WIDTH } from "@/lib/layout";
import { isCalendar, pageFromHash, type Page } from "@/lib/nav";
import { DEFAULT_SETTINGS, type Settings } from "@/lib/settings";

type Props = {
  calendar: React.ReactNode;
  trends: React.ReactNode;
  /** Right end of the header: `UserMenu`, or "sign in" on `/demo`. */
  navEnd: React.ReactNode;
  /** A band above the frame. Only `/demo` has one. */
  banner?: React.ReactNode;
  /** Defaults on `/demo`. */
  settings?: Settings;
};

/** Crossfades a section change where the browser can (CSS in globals.css); instant otherwise. */
function transition(update: () => void) {
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!document.startViewTransition || still) return update();
  document.startViewTransition(() => flushSync(update));
}

/** Section state + frame; views come as props so they render on the server. */
export function AppShell(props: Props) {
  // Null until a section is pressed (or read from the URL); draws the landing.
  const [page, setPage] = useState<Page | null>(null);
  const shown = useRef(page);
  useEffect(() => {
    shown.current = page;
  });

  useEffect(() => {
    const read = () => setPage(pageFromHash(window.location.hash));
    // Back fires popstate and hashchange; only a real change animates.
    const readLocation = () => {
      const next = pageFromHash(window.location.hash);
      if (next === shown.current) return;
      // Claimed now: the transition's update runs a frame later.
      shown.current = next;
      transition(read);
    };
    // The first read draws the landing section, so it skips the transition.
    read();
    window.addEventListener("popstate", readLocation);
    window.addEventListener("hashchange", readLocation);
    return () => {
      window.removeEventListener("popstate", readLocation);
      window.removeEventListener("hashchange", readLocation);
    };
  }, []);

  function changePage(next: Page) {
    if (window.location.hash !== `#${next}`) {
      window.history.pushState(null, "", `#${next}`);
    }
    // Claimed now, so a quick back before the update still registers.
    shown.current = next;
    transition(() => setPage(next));
  }

  return (
    <SettingsProvider settings={props.settings ?? DEFAULT_SETTINGS}>
      <CalendarDataProvider>
        <CalendarViewProvider
          view={page === null || isCalendar(page) ? page : "month"}
        >
          {props.banner}
          <PageFrame
            bottomNav
            header={
              <TopNav page={page} onPageChange={changePage} end={props.navEnd} />
            }
          >
            <main className={`${PAGE_WIDTH} flex-1 py-s4 [view-transition-name:page] lg:py-s6`}>
              {page === null || isCalendar(page) ? props.calendar : props.trends}
            </main>
          </PageFrame>

          <BottomNav page={page} onPageChange={changePage} />
        </CalendarViewProvider>
      </CalendarDataProvider>
    </SettingsProvider>
  );
}
