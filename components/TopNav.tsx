"use client";

import { SheetHeader } from "@/components/ui/SheetHeader";
import { formatDateNumeric, fromDayString } from "@/lib/dates";
import { LOGO } from "@/lib/layout";
import { NAV_ITEMS, isPlainClick, navItemFor, type Page } from "@/lib/nav";
import { useToday } from "@/lib/useToday";

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
  // Null until hydrated, so server and client agree. Phones get it in TodayView.
  const today = useToday(null);

  return (
    <SheetHeader
      start={
        <>
          <a
            href="#today"
            onClick={(event) => {
              if (!isPlainClick(event)) return;
              event.preventDefault();
              props.onPageChange("today");
            }}
            className={`${LOGO} text-heading sm:text-display-sm`}
          >
            baby steps
          </a>
          {today && current === "today" && (
            <time dateTime={today} className="hidden font-display text-heading font-light text-accent-ink sm:inline">
              {formatDateNumeric(fromDayString(today))}
            </time>
          )}
        </>
      }
      end={
        <>
          <nav aria-label="Sections" className="hidden sm:block">
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

          <div className="flex items-center">{props.end}</div>
        </>
      }
    />
  );
}
