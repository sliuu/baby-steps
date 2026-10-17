"use client";

import { NAV_ITEMS, isPlainClick, navItemFor, type Page } from "@/lib/nav";

type Props = {
  /** Null until a section is pressed; reads as the landing. */
  page: Page | null;
  onPageChange: (page: Page) => void;
  /** Right end: `UserMenu`, or "sign in" on `/demo`. */
  end: React.ReactNode;
};

/** Active: ink with a 1px underline. Inactive: muted. */
export function navLinkClass(active: boolean) {
  return `text-ui underline-offset-6 decoration-1 transition-colors ${
    active ? "text-ink underline" : "text-ink-muted hover:text-ink"
  }`;
}

/** The sheet's header: logo, nav (sm and up), account. */
export function TopNav(props: Props) {
  const current = navItemFor(props.page);

  return (
    <header className="flex h-16 items-center gap-8 border-b border-rule-strong px-5 lg:px-10">
      <a
        href="#today"
        onClick={(event) => {
          if (!isPlainClick(event)) return;
          event.preventDefault();
          props.onPageChange("today");
        }}
        className="font-heading text-subhead text-accent-ink"
      >
        baby steps
      </a>

      <nav aria-label="Sections" className="ml-auto hidden sm:block">
        <ul className="flex items-center gap-8">
          {NAV_ITEMS.map((item) => {
            const active = item.id === current;
            return (
              <li key={item.id}>
                <a
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  onClick={(event) => {
                    if (!isPlainClick(event)) return;
                    event.preventDefault();
                    props.onPageChange(item.page);
                  }}
                  className={navLinkClass(active)}
                >
                  {item.label}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="ml-auto flex items-center sm:ml-0">{props.end}</div>
    </header>
  );
}
