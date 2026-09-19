"use client";

import { useState } from "react";

import { BottomNav } from "./BottomNav";
import { TopNav } from "./TopNav";
import { CalendarViewProvider } from "@/components/calendar/viewMode";
import { PAGE_WIDTH } from "@/lib/layout";
import { isCalendar, type Page } from "@/lib/nav";

type Props = {
  calendar: React.ReactNode;
  trends: React.ReactNode;
  /**
   * The right-hand end of the nav, after the theme toggle: `UserMenu` when
   * signed in, a "Sign in" link on `/demo`.
   */
  navEnd: React.ReactNode;
  /** A band above the nav that scrolls away. Only `/demo` has one. */
  banner?: React.ReactNode;
};

/**
 * The only stateful thing in the shell.
 *
 * The two views arrive as props, not imports. That matters: a component
 * imported here would be pulled into the client bundle, but one passed in
 * from a Server Component is rendered on the server and handed over as
 * finished output. The switcher ships to the browser; the pages don't have to.
 *
 * **One shell for the signed-in app and `/demo`.** The two differ in the nav's
 * last control and in the demo's banner, and both arrive as slots rather than
 * as a user the shell would have to check for. Each page decides what goes
 * there, so nothing in here asks "what if nobody is signed in" — and the
 * padding, the switcher and the bottom bar exist once instead of twice.
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
    >
      {props.banner}
      <TopNav page={page} onPageChange={setPage} end={props.navEnd} />
      {/* 40px of top padding and not the old 56px. The target is a 14"
          laptop: 64px of nav plus 80px of padding leaves the page 144px to pay
          for before it has drawn anything, and a week of columns has to fit in
          what's left. Anything less starts to read as cramped against the
          nav's hairline.

          A phone gets 20px instead. Its screen is the short one, and every
          pixel above the section's title is one less of the section.

          Underneath, the extra is the phone's fixed nav bar, paid for here
          rather than left for the page to collide with — 56px of bar plus the
          page's own 40px is 6rem. Above 64rem there is no bar and the bottom
          goes back to matching the top. */}
      <main className={`${PAGE_WIDTH} flex-1 pt-5 pb-24 lg:pt-10 lg:pb-10`}>
        {/* Both landings are calendar sections, so null is a calendar. */}
        {page === null || isCalendar(page) ? props.calendar : props.trends}
      </main>

      <BottomNav page={page} onPageChange={setPage} />
    </CalendarViewProvider>
  );
}
