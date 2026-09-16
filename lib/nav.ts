export type Page = "today" | "week" | "month" | "trends";

/** Everything that isn't Trends. Three lenses on the same calendar. */
export type CalendarPage = Exclude<Page, "trends">;

/**
 * The four sections, in nav order. Real hrefs so the links behave like links —
 * focusable, copyable, openable in a new tab — even though we cancel the
 * default navigation and swap the body in React state instead.
 *
 * Today, Week and Month are three sections rather than one Calendar section
 * with a lens inside it, which is the reverse of the earlier call. All three
 * render the same `calendar` node, and it stays mounted across them:
 * everything expensive or stateful in there — the optimistic map, the anchored
 * day, the drag context — belongs to a component none of them unmounts, so
 * switching is still a re-render and not a reload.
 *
 * **Today is first, and it is first because of the phone.** The order is the
 * zoom level, widest last, and the narrowest one is the only section that fits
 * a 375px screen without asking anything of it — seven columns of named bars
 * do not, and forty-two cells really do not. It leads the row on the desktop
 * pill too rather than being a mobile-only destination, because a section that
 * exists at one width and not another is a section you can be stranded in when
 * the window changes size.
 */
export const PAGES: { id: Page; label: string; href: string }[] = [
  { id: "today", label: "Today", href: "#today" },
  { id: "week", label: "Week", href: "#week" },
  { id: "month", label: "Month", href: "#month" },
  { id: "trends", label: "Trends", href: "#trends" },
];

/**
 * Everything that isn't Trends draws a calendar.
 *
 * A type guard rather than a plain boolean, so the caller that has to hand a
 * view mode to the calendar gets one without a cast. The three calendar pages
 * and the three calendar view modes are deliberately the same three strings.
 */
export function isCalendar(page: Page): page is CalendarPage {
  return page !== "trends";
}
