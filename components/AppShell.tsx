"use client";

import { BottomNav } from "./BottomNav";
import { TopNav } from "./TopNav";
import { useSection } from "./useSection";
import { CalendarViewProvider } from "@/components/calendar/viewMode";
import { PAGE_WIDTH } from "@/lib/layout";
import { isCalendar } from "@/lib/nav";
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
  // Not a plain `useState("month")` any more: the landing section depends on
  // how wide the window is, and `useSection` is where that argument lives.
  const [page, setPage] = useSection();

  return (
    // Today, Week and Month are the same node, and the provider is how it
    // finds out which one it's being asked for — see `viewMode.tsx`. It wraps
    // `<main>` rather than the calendar alone because `props.calendar` is a
    // node, not a component: there is nothing here to wrap it in that isn't
    // this.
    <CalendarViewProvider view={isCalendar(page) ? page : "month"}>
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
        {isCalendar(page) ? props.calendar : props.trends}
      </main>

      <BottomNav page={page} onPageChange={setPage} />
    </CalendarViewProvider>
  );
}
