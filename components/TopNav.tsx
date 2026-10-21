"use client";

import { ChevronDown } from "lucide-react";

import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/Menu";
import { SheetHeader } from "@/components/ui/SheetHeader";
import { ThemeToggle } from "@/components/ThemeToggle";
import { formatDateShort, fromDayString } from "@/lib/dates";
import { Logo } from "@/components/ui/Logo";
import { LOGO } from "@/lib/layout";
import { NAV_ITEMS, isPlainClick, navItemFor, type Page } from "@/lib/nav";
import { useToday } from "@/lib/useToday";

type Props = {
  /** Null = landing. */
  page: Page | null;
  onPageChange: (page: Page) => void;
  /** Right end: `UserMenu`, or "exit" on `/demo`. */
  end: React.ReactNode;
};

/** Active: ink with a 1px underline. Inactive: muted. */
export function navLinkClass(active: boolean) {
  return `text-ui underline-offset-6 decoration-1 transition-colors ${
    active ? "text-ink underline" : "text-ink-muted hover:text-ink"
  }`;
}

/** The sheet's header: logo, nav (a dropdown until it fits, then links), account. */
export function TopNav(props: Props) {
  const current = navItemFor(props.page);
  // Null until hydrated, so server and client agree. Narrower screens get it in TodayView.
  const today = useToday(null);

  return (
    <SheetHeader
      themeToggle={false}
      start={
        <>
          <a
            href="#today"
            onClick={(event) => {
              if (!isPlainClick(event)) return;
              event.preventDefault();
              props.onPageChange("today");
            }}
            className={LOGO}
          >
            <Logo />
          </a>
          {today && current === "today" && (
            <time dateTime={today} className="hidden translate-y-0.5 font-display text-date font-normal text-ink min-[56rem]:inline">
              {formatDateShort(fromDayString(today))}
            </time>
          )}
        </>
      }
      end={
        <>
          {/* Mid widths: the three links don't fit beside the date. */}
          <Menu>
            <MenuTrigger
              className={`hidden items-center gap-1 outline-none sm:inline-flex min-[56rem]:hidden ${navLinkClass(true)}`}
              aria-label={`Sections, on ${current}`}
            >
              {current}
              <ChevronDown className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
            </MenuTrigger>
            <MenuContent align="end" className="w-40">
              {NAV_ITEMS.map((item) => (
                <MenuItem
                  key={item.id}
                  onSelect={() => props.onPageChange(item.page)}
                  aria-current={item.id === current ? "page" : undefined}
                  className={item.id === current ? "text-ink" : "text-ink-muted"}
                >
                  {item.label}
                </MenuItem>
              ))}
            </MenuContent>
          </Menu>

          <nav aria-label="Sections" className="hidden min-[56rem]:block">
            <ul className="flex items-center gap-s5">
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

          <div className="flex items-center gap-s3">
            <ThemeToggle />
            {props.end}
          </div>
        </>
      }
    />
  );
}
