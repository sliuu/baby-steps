"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";

/** Pause before each fresh request, so a lagging verifier has time to catch up. */
const DELAY_MS = 1500;

/** Fresh requests before giving up and showing the error page. */
const MAX_ATTEMPTS = 3;

/**
 * Pressing "Try again" for you, when the sign-in token hasn't settled.
 *
 * Rendered by a view in place of its board when the server's own retries ran
 * out on `TokenSettlingError` — see `lib/queries/settling.ts` for why those
 * retries can't finish the job alone. It keeps showing the view's skeleton, so
 * from the outside this is a page that loads a few seconds late rather than an
 * error page and a button.
 *
 * `router.refresh()` is a fresh server request for the whole route, the same
 * thing the error page's button does. When it succeeds the server sends the
 * real board, this component unmounts, and the loop ends by itself; staying
 * mounted *is* the signal that the last attempt failed too. `refresh` keeps
 * client state, so the attempt count survives between requests.
 *
 * Both views render one of these when it happens, since both read the same
 * queries. Their timers fire together and the router folds the second refresh
 * into the first, so it is still one request per attempt.
 *
 * After `MAX_ATTEMPTS` it throws, and `app/error.tsx` takes over with the same
 * button as before. Something that outlasts three fresh requests is no longer
 * the race this exists for.
 */
export function SettlingRetry({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [attempts, setAttempts] = useState(0);
  const [refreshing, startRefresh] = useTransition();

  useEffect(() => {
    if (refreshing || attempts >= MAX_ATTEMPTS) return;

    const timer = setTimeout(() => {
      // The count goes up *inside* the transition, so it lands in the same
      // commit as the refresh's answer. Bumped outside it, the urgent update
      // renders first, and the third attempt reads as spent — and throws —
      // before its request has gone out.
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
