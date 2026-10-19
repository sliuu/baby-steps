"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";

/** Pause before each refresh, so a lagging verifier catches up. */
const DELAY_MS = 1500;

/** Fresh requests before giving up and showing the error page. */
const MAX_ATTEMPTS = 3;

/**
 * Auto "Try again" on `TokenSettlingError` (see `lib/queries/settling.ts`).
 * Shows the skeleton and refreshes; success unmounts it. Throws to
 * `app/error.tsx` after `MAX_ATTEMPTS`.
 */
export function SettlingRetry({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [attempts, setAttempts] = useState(0);
  const [refreshing, startRefresh] = useTransition();

  useEffect(() => {
    if (refreshing || attempts >= MAX_ATTEMPTS) return;

    const timer = setTimeout(() => {
      // Bump inside the transition, or the last attempt throws before it's sent.
      startRefresh(() => {
        setAttempts((n) => n + 1);
        router.refresh();
      });
    }, DELAY_MS);
    return () => clearTimeout(timer);
  }, [attempts, refreshing, router]);

  if (attempts >= MAX_ATTEMPTS && !refreshing) {
    throw new Error(
      `Sign-in token still not accepted after ${MAX_ATTEMPTS} fresh requests`,
    );
  }

  return children;
}
