"use client";

import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";
import { PAGE_WIDTH, segment } from "@/lib/layout";
import { PAGES, type Page } from "@/lib/nav";
import type { SessionUser } from "@/lib/user";

/**
 * Presentational. It doesn't own which page is showing — it's told, and it
 * reports clicks upward. State lives one level up in AppShell, because the
 * page body needs it too.
 */
type Props = {
  page: Page;
  onPageChange: (page: Page) => void;
  user: SessionUser;
};

export function TopNav(props: Props) {
  return (
    <header className="sticky top-0 z-20 border-b border-hairline bg-background/85 backdrop-blur-sm">
      <nav className={`${PAGE_WIDTH} flex h-16 items-center gap-6`}>
        <span className="font-heading text-2xl font-semibold tracking-tight">
          Baby Steps
        </span>

        <div className="flex flex-1 justify-center">
          <div className="flex items-center gap-1">
            {PAGES.map(({ id, label, href }) => {
              const active = id === props.page;
              return (
                <a
                  key={id}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  onClick={(event) => {
                    // Keep the browser out of it: no reload, no history entry.
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

        <div className="flex items-center gap-1">
          <ThemeToggle />
          <UserMenu user={props.user} />
        </div>
      </nav>
    </header>
  );
}
