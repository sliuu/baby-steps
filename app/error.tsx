"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { NoticePage } from "@/components/ui/NoticePage";

/** Route error boundary: say so, offer a retry. */
export default function ErrorBoundary({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  // Production only keeps `digest`; log both.
  useEffect(() => {
    console.error("Route error", { digest: error.digest, error });
  }, [error]);

  return (
    <NoticePage
      eyebrow="something went sideways"
      title="that didn’t load"
      action={
        // Next 16.2: re-fetches the segment, swaps only on success.
        <Button variant="filled" size="md" onClick={unstable_retry}>
          try again
        </Button>
      }
    >
      your stickers are safe; this was the page, not your calendar. trying again usually does it.
    </NoticePage>
  );
}
