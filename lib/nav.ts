/** URL-fragment section. Week and month are both "calendar" in the nav. */
export type Page = "today" | "week" | "month" | "trends";

export type CalendarPage = Exclude<Page, "trends">;

const PAGE_IDS: Page[] = ["today", "week", "month", "trends"];

export type NavItem = {
  id: "today" | "calendar" | "trends";
  label: string;
  href: string;
  /** Where a plain click goes. */
  page: Page;
  /** Sections that light this item up. */
  pages: Page[];
};

// Week is reachable only by #week until plan 09 adds the month · week toggle.
export const NAV_ITEMS: NavItem[] = [
  { id: "today", label: "today", href: "#today", page: "today", pages: ["today"] },
  { id: "calendar", label: "calendar", href: "#month", page: "month", pages: ["month", "week"] },
  { id: "trends", label: "trends", href: "#trends", page: "trends", pages: ["trends"] },
];

/** Parse a fragment into a section; rejects unknown strings. */
export function pageFromHash(hash: string): Page | null {
  const value = hash.startsWith("#") ? hash.slice(1) : hash;
  return PAGE_IDS.includes(value as Page) ? (value as Page) : null;
}

export function isCalendar(page: Page): page is CalendarPage {
  return page !== "trends";
}

/** Where a cold load lands, at every width. */
export const LANDING: CalendarPage = "today";

/** The nav item for a section; null (nothing pressed yet) is the landing. */
export function navItemFor(page: Page | null): NavItem["id"] {
  const current = page ?? LANDING;
  return NAV_ITEMS.find((item) => item.pages.includes(current))!.id;
}

/** Plain left clicks go in-app; modified clicks stay native. */
export function isPlainClick(event: React.MouseEvent): boolean {
  return !(
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  );
}
