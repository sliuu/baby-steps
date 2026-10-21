"use client";

import { useRef, type RefObject } from "react";

/**
 * For a Radix dialog opened without a `Trigger`: focus goes back to whatever opened it,
 * else to `fallback` (say, a menu's button), not to the page body. Spread onto the Content.
 */
export function useReturnFocus(fallback?: RefObject<HTMLElement | null>) {
  const opener = useRef<HTMLElement | null>(null);
  return {
    // Fires before focus moves in, so this is still the opener.
    onOpenAutoFocus: () => {
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    },
    onCloseAutoFocus: (event: Event) => {
      const to = opener.current?.isConnected && opener.current !== document.body ? opener.current : fallback?.current;
      if (!to?.isConnected) return;
      event.preventDefault();
      to.focus();
    },
  };
}
