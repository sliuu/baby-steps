"use client";

import { ThemeToggle } from "./ThemeToggle";
import { LANDING_WIDE } from "@/lib/nav";
import { PAGE_WIDTH, segment } from "@/lib/layout";
import { PAGES, type Page } from "@/lib/nav";

/**
 * Presentational. It doesn't own which page is showing — it's told, and it
 * reports clicks upward. State lives one level up in AppShell, because the
 * page body needs it too.
 */
type Props = {
  /** Null until a section is pressed. See `LANDING_NARROW` in `lib/nav.ts`. */
  page: Page | null;
  onPageChange: (page: Page) => void;
  /** Whatever sits after the theme toggle. See `navEnd` on `AppShell`. */
  end: React.ReactNode;
};

export function TopNav(props: Props) {
  return (
    <header className="sticky top-0 z-20 border-b border-hairline bg-background/85 backdrop-blur-sm">
      <nav className={`${PAGE_WIDTH} flex h-16 items-center gap-6`}>
        <span className="font-heading text-panel-title">
          Baby Steps
        </span>

        {/* Gone below 64rem, where `BottomNav` takes over. Four segments at
            this padding want most of a phone's width on their own, and the
            wordmark and the two controls still have to fit beside them. The
            two switchers are mutually exclusive by construction — same
            breakpoint, opposite sign — so there is never a screen with both. */}
        <div className="hidden flex-1 justify-center lg:flex">
          <div className="flex items-center gap-1">
            {PAGES.map(({ id, label, href }) => {
              // Null is "nothing pressed yet". This pill is `hidden lg:flex`,
              // so the only landing it can ever show is the wide one — no
              // measurement needed, and none possible on the server.
              const active = id === (props.page ?? LANDING_WIDE);
              return (
                <a
                  key={id}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  onClick={(event) => {
                    // Modified clicks keep native link behavior, including
                    // opening this section in a new tab.
                    if (
                      event.button !== 0 ||
                      event.metaKey ||
                      event.ctrlKey ||
                      event.shiftKey ||
                      event.altKey
                    ) {
                      return;
                    }
                    event.preventDefault();
                    props.onPageChange(id);
                  }}
                  // Shared with the Trends chart switcher, which is a radio
                  // group rather than links. See `segment`.
                  className={segment(active)}
                >
                  {label}
                </a>
              );
            })}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          {props.end}
        </div>
      </nav>
    </header>
  );
}
