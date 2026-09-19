"use client";

import { useState } from "react";

import { BottomNav } from "./BottomNav";
import { TopNav } from "./TopNav";
import { CalendarViewProvider } from "@/components/calendar/viewMode";
import { PAGE_WIDTH } from "@/lib/layout";
import { isCalendar, type Page } from "@/lib/nav";
import type { SessionUser } from "@/lib/user";

type Props = {
  calendar: React.ReactNode;
  trends: React.ReactNode;
  user: SessionUser;
};

/**
 * The only stateful thing in the shell.
 *
 * The two views arrive as props, not imports. That matters: a component
 * imported here would be pulled into the client bundle, but one passed in
 * from a Server Component is rendered on the server and handed over as
 * finished output. The switcher ships to the browser; the pages don't have to.
 *
 * `user` is plain data rather than a rendered node — it's small, and TopNav
 * needs the individual fields, not finished markup.
 */
export function AppShell(props: Props) {
  // Null means "nothing pressed yet", and it is a real state rather than a
  // missing one: the landing section depends on the window, the server has no
  // window, so the choice is deferred to CSS and both landings are drawn. See
  // `LANDING_NARROW` in `lib/nav.ts`. A press fills this in permanently.
  const [page, setPage] = useState<Page | null>(null);

  return (
    // Today, Week and Month are the same node, and the provider is how it
    // finds out which one it's being asked for — see `viewMode.tsx`. It wraps
    // `<main>` rather than the calendar alone because `props.calendar` is a
    // node, not a component: there is nothing here to wrap it in that isn't
    // this.
    <CalendarViewProvider
      // Null travels down as null: the calendar draws both landings and
      // hides one, exactly as it does for the week and the month.
      view={page === null || isCalendar(page) ? page : "month"}
      // Tapping a day in the week list or the month grid opens it, and
      // "opens it" means this. The three view modes are three of the four
      // pages, so the setter goes down unadapted.
      onChangeView={setPage}
    >
      <TopNav page={page} onPageChange={setPage} user={props.user} />
      {/* 40px of top padding and not the old 56px. The target is a 14"
          laptop: 64px of nav plus 80px of padding leaves the page 144px to pay
          for before it has drawn anything, and a week of columns has to fit in
          what's left. Anything less starts to read as cramped against the
          nav's hairline.

          Underneath, the extra is the phone's fixed nav bar, paid for here
          rather than left for the page to collide with — 56px of bar plus the
          page's own 40px is 6rem. Above 64rem there is no bar and the bottom
          goes back to matching the top. */}
      <main className={`${PAGE_WIDTH} flex-1 pt-10 pb-24 lg:pb-10`}>
        {/* Both landings are calendar sections, so null is a calendar. */}
        {page === null || isCalendar(page) ? props.calendar : props.trends}
      </main>

      <BottomNav page={page} onPageChange={setPage} />
    </CalendarViewProvider>
  );
}
