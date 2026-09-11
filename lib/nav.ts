export type Page = "week" | "month" | "trends";

/**
 * The three sections, in nav order. Real hrefs so the links behave like links —
 * focusable, copyable, openable in a new tab — even though we cancel the
 * default navigation and swap the body in React state instead.
 *
 * Week and Month are two sections rather than one Calendar section with a lens
 * inside it, which is the reverse of the earlier call. Both render the same
 * `calendar` node, and it stays mounted across the two: everything expensive or
 * stateful in there — the optimistic map, the anchored day, the drag context —
 * belongs to a component neither section unmounts, so switching is still a
 * re-render and not a reload.
 */
export const PAGES: { id: Page; label: string; href: string }[] = [
  { id: "week", label: "Week", href: "#week" },
  { id: "month", label: "Month", href: "#month" },
  { id: "trends", label: "Trends", href: "#trends" },
];

/** Everything that isn't Trends draws a calendar. */
export function isCalendar(page: Page): boolean {
  return page === "week" || page === "month";
}
