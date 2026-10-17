"use client";

import { useEffect, useState } from "react";

import { BottomNav } from "./BottomNav";
import { TopNav } from "./TopNav";
import { PageFrame } from "@/components/ui/PageFrame";
import { CalendarDataProvider } from "@/components/calendar/calendarData";
import { CalendarViewProvider } from "@/components/calendar/viewMode";
import { PAGE_WIDTH } from "@/lib/layout";
import { isCalendar, pageFromHash, type Page } from "@/lib/nav";

type Props = {
  calendar: React.ReactNode;
  trends: React.ReactNode;
  /** Right end of the header: `UserMenu`, or "sign in" on `/demo`. */
  navEnd: React.ReactNode;
  /** A band above the frame. Only `/demo` has one. */
  banner?: React.ReactNode;
};

/**
 * Section state + frame. Views arrive as props so they render on the server.
 * Shared by `/` and `/demo`; they differ only in `navEnd` and `banner`.
 */
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
          <main className={`${PAGE_WIDTH} flex-1 py-5 lg:py-10`}>
            {page === null || isCalendar(page) ? props.calendar : props.trends}
          </main>
        </PageFrame>

        <BottomNav page={page} onPageChange={changePage} />
      </CalendarViewProvider>
    </CalendarDataProvider>
  );
}
