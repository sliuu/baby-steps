"use client";

import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";
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
      <nav className="mx-auto flex h-16 w-full max-w-5xl items-center gap-6 px-8">
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
                  className={`rounded-full px-5 py-1.5 text-[0.95rem] transition-colors ${
                    active
                      ? "bg-secondary text-ink"
                      : "text-ink-muted hover:text-ink"
                  }`}
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
