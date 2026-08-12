export type Page = "calendar" | "trends";

/**
 * The two pages, in nav order. Real hrefs so the links behave like links —
 * focusable, copyable, openable in a new tab — even though we cancel the
 * default navigation and swap the body in React state instead.
 */
export const PAGES: { id: Page; label: string; href: string }[] = [
  { id: "calendar", label: "Calendar", href: "#calendar" },
  { id: "trends", label: "Trends", href: "#trends" },
];
