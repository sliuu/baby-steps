"use client";

import { useState, useSyncExternalStore } from "react";

import type { Page } from "@/lib/nav";

/**
 * The same breakpoint the layout uses, written as a query rather than as a
 * utility prefix. 64rem is the point at which the top nav has room for a pill
 * and the calendar has room for a tray beside it.
 */
const WIDE = "(min-width: 64rem)";

let query: MediaQueryList | null = null;

function media(): MediaQueryList {
  return (query ??= window.matchMedia(WIDE));
}

function subscribe(onChange: () => void): () => void {
  const mq = media();
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/**
 * Which section is showing, and the one piece of state behind it.
 *
 * **The landing section is derived from the window, not stored.** A phone that
 * opens on the month grid opens on forty-two cells about 40px wide, which is
 * the single worst screen this app can draw; a laptop that opens on one day is
 * a laptop showing a column of five things in a 1536px page. So the default is
 * the widest view the window can hold — and it stays *derived* until you press
 * something, which means rotating a tablet or dragging a window narrow moves
 * you to the view that fits rather than leaving you in the one that doesn't.
 * Press a section and `chosen` takes over permanently: an explicit choice
 * outranks the measurement, and a nav that changed under you at a particular
 * window width would be a nav you can't trust.
 *
 * The clock problem again, in a different costume. `matchMedia` does not exist
 * on the server and the server has no width to report, so reading it during
 * render would make the markup depend on which machine drew it. That is what
 * `useSyncExternalStore`'s third argument is for: `null` on the server *and*
 * during hydration, so both runs agree on the wide default, and React switches
 * to the real measurement on the very next render. A phone therefore paints
 * the month for one frame before landing on Today. Worth saying out loud —
 * the alternative is either a mismatch warning or holding the whole page back
 * until JavaScript arrives, and a frame is cheaper than both.
 */
export function useSection(): [Page, (page: Page) => void] {
  const [chosen, setChosen] = useState<Page | null>(null);

  const wide = useSyncExternalStore(
    subscribe,
    () => media().matches, // browser: the real window
    () => null, // server and hydration: no window to measure
  );

  return [chosen ?? (wide === false ? "today" : "month"), setChosen];
}
