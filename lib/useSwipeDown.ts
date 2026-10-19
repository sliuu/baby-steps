"use client";

import { useEffect, useRef, useState } from "react";

/** Past this, or a quick flick, lets go into a dismiss. */
const DISTANCE = 96;
const FLICK = 0.5; // px per ms

/**
 * Drag a bottom sheet down to dismiss it, from anywhere on it; in the
 * scroller, only once it is at the top. Uses `transform`, so the
 * sheet's `translate` keyframes are untouched.
 */
export function useSwipeDown(onDismiss: () => void) {
  // State, not a ref: the sheet mounts through a portal, after this hook.
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const dismiss = useRef(onDismiss);
  useEffect(() => {
    dismiss.current = onDismiss;
  });

  useEffect(() => {
    if (!node) return;
    const el = node;
    let start: { y: number; t: number } | null = null;
    let offset = 0;

    const settle = (to: string, then?: () => void) => {
      el.style.transition = "transform var(--dur-panel-out) var(--ease-enter)";
      el.style.transform = to;
      if (!then) return;
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        then();
      };
      el.addEventListener("transitionend", finish, { once: true });
      window.setTimeout(finish, 400);
    };

    function onStart(event: TouchEvent) {
      const list = scroller.current;
      const inList = list?.contains(event.target as Node);
      // In the list, only once it can't scroll up any further.
      if (inList && list && list.scrollTop > 0) return;
      start = { y: event.touches[0].clientY, t: event.timeStamp };
      offset = 0;
    }

    function onMove(event: TouchEvent) {
      if (!start) return;
      const dy = event.touches[0].clientY - start.y;
      if (dy <= 0 && offset === 0) {
        // Upward first: it's a scroll, not a swipe.
        start = null;
        return;
      }
      event.preventDefault();
      offset = Math.max(0, dy);
      el.style.transition = "none";
      el.style.transform = `translateY(${offset}px)`;
    }

    function onEnd(event: TouchEvent) {
      if (!start) return;
      const speed = offset / Math.max(1, event.timeStamp - start.t);
      start = null;
      if (offset === 0) return;
      if (offset > DISTANCE || speed > FLICK) settle("translateY(100%)", () => dismiss.current());
      else settle("translateY(0)");
    }

    el.addEventListener("touchstart", onStart, { passive: true });
    // Not passive: it has to stop the page scrolling under the drag.
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, [node]);

  return { sheetRef: setNode, scrollerRef: scroller };
}
