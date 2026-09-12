"use client";

import { useState } from "react";

import { ThemeToggle } from "@/components/ThemeToggle";
import { CalendarViewProvider } from "@/components/calendar/viewMode";
import { PAGE_WIDTH, segment } from "@/lib/layout";
import { isCalendar, PAGES, type Page } from "@/lib/nav";

type Props = {
  calendar: React.ReactNode;
  trends: React.ReactNode;
};

/**
 * `AppShell` for somebody who hasn't signed in.
 *
 * The same three sections, the same switcher, the same layout — and it is a
 * separate file rather than a flag on `AppShell` for one reason: the two
 * differ in the nav, and only in the nav. `AppShell` takes a `SessionUser` and
 * hands it to `UserMenu`; there is no user here, and threading an optional one
 * through both would put a "what if there is nobody" branch in the signed-in
 * app to serve a page the signed-in app never renders. Below the header the
 * two are the same node — literally, `CalendarBoard` and `TrendsBoard` with a
 * generated year in them.
 *
 * The views arrive as props for the reason they do there too: passed in from a
 * Server Component they are rendered markup, not imports, so the switcher is
 * all that ships to the browser.
 */
export function DemoShell(props: Props) {
  const [page, setPage] = useState<Page>("month");

  return (
    <CalendarViewProvider view={page === "week" ? "week" : "month"}>
      {/* Above the sticky header rather than inside it, and it scrolls away.
          A banner is an answer to "what am I looking at", which is a question
          you have once, on arrival — pinning it to the top of the window would
          spend a permanent band of the screen restating it. The way *out* of
          the demo is the part that has to stay reachable, and that is the
          button in the nav, which is sticky. */}
      <div className="border-b border-hairline bg-secondary/60">
        <p className={`${PAGE_WIDTH} py-2.5 text-[0.83rem] text-ink-muted`}>
          <span className="text-ink">This is a demo.</span> A year of invented
          stickers, ending today. Drag them about, change a mood, write a note —
          nothing you do here is saved anywhere.
        </p>
      </div>

      <header className="sticky top-0 z-20 border-b border-hairline bg-background/85 backdrop-blur-sm">
        <nav className={`${PAGE_WIDTH} flex h-16 items-center gap-6`}>
          <span className="font-heading text-panel-title">Baby Steps</span>

          <div className="flex flex-1 justify-center">
            <div className="flex items-center gap-1">
              {PAGES.map(({ id, label, href }) => {
                const active = id === page;
                return (
                  <a
                    key={id}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    onClick={(event) => {
                      event.preventDefault();
                      setPage(id);
                    }}
                    className={segment(active)}
                  >
                    {label}
                  </a>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            {/* A real navigation, not a router push: leaving the demo should
                drop everything in it, and a full load is the cheapest way to
                be sure a year of invented stickers is gone. */}
            <a
              href="/login"
              className="rounded-full border border-hairline px-4 py-1.5 text-[0.875rem] transition-colors hover:bg-secondary"
            >
              Sign in
            </a>
          </div>
        </nav>
      </header>

      <main className={`${PAGE_WIDTH} flex-1 py-10`}>
        {isCalendar(page) ? props.calendar : props.trends}
      </main>
    </CalendarViewProvider>
  );
}
