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

/**
 * Where a cold load lands — and there are two, because the answer depends on
 * how wide the window is.
 *
 * Which is exactly why neither of them is *chosen* here. The server has no
 * window to measure, so any JavaScript that picks between these two picks
 * after the markup has already been drawn and painted, and the correction is
 * a whole section changing under the reader a second into the page. That was
 * the third of the three flashes. Both are rendered instead and CSS picks —
 * `TopNav` only exists above 64rem and `BottomNav` only below it, so each nav
 * simply uses its own side's answer and never needs to know the other.
 *
 * The section state starts as `null`, meaning "nothing pressed yet", and these
 * two stand in for it until something is. A press replaces them permanently:
 * an explicit choice outranks the window, and a nav that changed under you at
 * a particular width would be a nav you can't trust.
 *
 * Why these two. A phone opening on forty-two desktop cells was the single
 * worst screen this app could draw, and a laptop opening on one day is a
 * column of five things in a 1536px page. Both still hold — the phone's month
 * is a real screen now, but the day is still the better place to *start* on a
 * phone, because it is the one you act on.
 *
 * **What this replaced was a hook, `useSection`, and the file is gone.** It
 * held the section state and derived the landing from `matchMedia`, with
 * `useSyncExternalStore`'s third argument returning `null` on the server and
 * during hydration — the documented contract, working as written, and still
 * wrong: a measurement that only exists after hydration is a measurement the
 * first paint cannot use. A phone painted the desktop month and then swapped
 * to Today a beat later. Its sibling `useNarrow` did the same thing for the
 * calendar's week and month drawings, and went the same way; that one is
 * written up on the branch in `CalendarPanel`. Both are now CSS.
 *
 * The thing genuinely lost is re-derivation on resize: the old hook moved you
 * to the view that fits when a window was dragged across 64rem, right up until
 * you pressed something. The nav can't do that any more — but the pressing is
 * what a nav is for, and the calendar underneath it does still swap drawings
 * on resize, because `lg:hidden` is live in a way a rendered default is not.
 */
export const LANDING_NARROW: CalendarPage = "today";
export const LANDING_WIDE: CalendarPage = "month";

