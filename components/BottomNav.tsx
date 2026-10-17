"use client";

import { NAV_ITEMS, isPlainClick, navItemFor, type Page } from "@/lib/nav";
import { navLinkClass } from "./TopNav";

type Props = {
  /** Null until a section is pressed; reads as the landing. */
  page: Page | null;
  onPageChange: (page: Page) => void;
};

/** Phone nav (below sm): three text items on paper, fixed to the bottom. */
export function BottomNav(props: Props) {
  const current = navItemFor(props.page);

  return (
    <nav
      aria-label="Sections"
      className="fixed inset-x-0 bottom-0 z-30 h-(--bottom-nav-h) border-t border-rule-strong bg-paper sm:hidden"
    >
      <ul className="grid h-full grid-cols-3">
        {NAV_ITEMS.map((item) => {
          const active = item.id === current;
          return (
            <li key={item.id} className="grid">
              <a
                href={item.href}
                aria-current={active ? "page" : undefined}
                onClick={(event) => {
                  if (!isPlainClick(event)) return;
                  event.preventDefault();
                  props.onPageChange(item.page);
                }}
                className={`grid place-items-center ${navLinkClass(active)}`}
              >
                {item.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
