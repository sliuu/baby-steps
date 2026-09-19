"use client";

import {
  ChartNoAxesColumn,
  CircleDot,
  Columns3,
  LayoutGrid,
  type LucideIcon,
} from "lucide-react";

import { LANDING_NARROW, PAGES, type Page } from "@/lib/nav";

/**
 * A picture per section, because the labels alone are 10px on a phone.
 *
 * Deliberately not four calendars. Lucide has a `calendar-check`, a
 * `calendar-days` and a `calendar-range`, and three variations of the same
 * grid at 20px is four tabs you have to read the caption of. These are four
 * different *shapes*: one filled dot, three columns, a grid of squares, a bar
 * chart. Each is a small picture of what the section draws.
 */
const ICON: Record<Page, LucideIcon> = {
  today: CircleDot,
  week: Columns3,
  month: LayoutGrid,
  trends: ChartNoAxesColumn,
};

type Props = {
  /** Null until a section is pressed. See `LANDING_NARROW` in `lib/nav.ts`. */
  page: Page | null;
  onPageChange: (page: Page) => void;
};

/**
 * The phone's navigation: four destinations along the bottom edge.
 *
 * It exists because the top nav's pill doesn't survive a 375px screen — four
 * segments at 40px of horizontal padding each want about 380px on their own,
 * before the wordmark and the two controls beside them. The pill is hidden
 * below the same breakpoint this bar appears at, so there is exactly one
 * switcher on screen at any width and never two.
 *
 * **At the bottom rather than in a drawer, and that is a reachability call.**
 * The four sections are the whole app; a hamburger would put a tap in front of
 * every one of them to save a band of screen that a fixed bar spends better —
 * and the bottom of a phone is where a thumb already is. Cost is the band
 * itself, which `AppShell` pays for with bottom padding on the page rather
 * than by letting content slide under a translucent bar and become
 * unreadable at the last line.
 *
 * **No safe-area padding, because there is nothing to pad against.** The
 * home-indicator inset only becomes a number a page can read once the viewport
 * is told to extend into it, and this app leaves the viewport at its default —
 * so the layout viewport already stops above the indicator and a fixed bar
 * lands on the last usable row rather than behind the bar iOS draws. The
 * inset padding goes in here on the day the page opts into covering the
 * screen, and not before: a declaration that always resolves to zero is one
 * you can't tell is broken.
 *
 * Links, not buttons, for the same reason the pill uses them: they are real
 * hrefs that we cancel, so the section is focusable, has a URL you can see in
 * the status bar, and reads as navigation to a screen reader.
 */
export function BottomNav(props: Props) {
  return (
    <nav
      aria-label="Sections"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-background/95 backdrop-blur-sm lg:hidden"
    >
      <ul className="grid grid-cols-4">
        {PAGES.map(({ id, label, href }) => {
          // The mirror of `TopNav`: this bar is `lg:hidden`, so the only
          // landing it can show is the narrow one.
          const active = id === (props.page ?? LANDING_NARROW);
          const Icon = ICON[id];

          return (
            <li key={id}>
              <a
                href={href}
                aria-current={active ? "page" : undefined}
                onClick={(event) => {
                  event.preventDefault();
                  props.onPageChange(id);
                }}
                // `min-h-14` is the tap target, not the type. 56px is
                // comfortably over the 44px floor and leaves the icon and its
                // word room to stack without the row feeling like a toolbar.
                className={`flex min-h-14 flex-col items-center justify-center gap-1 transition-colors ${
                  active ? "text-ink" : "text-ink-muted"
                }`}
              >
                <Icon
                  className="size-5"
                  // The active section is drawn a shade heavier rather than in
                  // a different colour: the six ramp hues mean *life areas*
                  // everywhere else in this app, and spending one on "you are
                  // here" would make the nav look like a seventh area.
                  strokeWidth={active ? 2 : 1.5}
                  aria-hidden="true"
                />
                <span className="text-[0.625rem] leading-none">{label}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
