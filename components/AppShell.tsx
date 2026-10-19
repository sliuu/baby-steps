"use client";

import { useEffect, useState } from "react";

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

/** Section state + frame; views come as props so they render on the server. */
export function AppShell(props: Props) {
  // Null until a section is pressed (or read from the URL); draws the landing.
  const [page, setPage] = useState<Page | null>(null);

  useEffect(() => {
    const readLocation = () => setPage(pageFromHash(window.location.hash));
    readLocation();
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
    setPage(next);
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
            <main className={`${PAGE_WIDTH} flex-1 py-s4 lg:py-s6`}>
              {page === null || isCalendar(page) ? props.calendar : props.trends}
            </main>
          </PageFrame>

          <BottomNav page={page} onPageChange={changePage} />
        </CalendarViewProvider>
      </CalendarDataProvider>
    </SettingsProvider>
  );
}
