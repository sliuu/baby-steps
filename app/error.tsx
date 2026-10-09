"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

/**
 * What a failed page looks like instead of the dev overlay's stack trace.
 *
 * Until this file existed there was no error boundary anywhere in the app, so
 * a single query throwing took the whole route down with nothing to press. In
 * development that reads as Next's red overlay; in production it is a bare
 * "Application error" on a white page. Neither says the one useful thing,
 * which is that trying again is usually enough.
 *
 * A boundary is not a substitute for fixing the throw — `lib/queries/settling.ts`
 * is where the known transient one is actually handled, and it retries before
 * anything reaches here. This is the floor under everything that isn't known.
 *
 * `error.tsx` must be a Client Component: it receives `unstable_retry`, which
 * is a function, and functions do not cross the server boundary.
 */
export default function ErrorBoundary({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  // The server's copy of the message is the one worth having. In production
  // `error.message` is replaced with a generic string and only `digest`
  // survives to correlate the two, so log both rather than assuming the text
  // in hand means anything.
  useEffect(() => {
    console.error("Route error", { digest: error.digest, error });
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-8 py-24 text-center">
      <p className="eyebrow mb-3">Something went sideways</p>
      <h1 className="mb-4 font-heading text-section-title">
        That didn&rsquo;t load
      </h1>
      <p className="mb-8 text-ink-muted">
        Your stickers are safe — this was the page, not your calendar. Trying
        again usually does it.
      </p>
      {/* Next 16.2 gives route error boundaries a retry that does both jobs in
          one operation: it re-fetches the failed segment, then replaces the
          fallback only if that fresh render succeeds. `reset()` merely
          re-rendered the already-failed contents, while starting
          `router.refresh()` beside it left the two operations racing. */}
      <Button onClick={unstable_retry}>
        Try again
      </Button>
    </main>
  );
}
