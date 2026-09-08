import Link from "next/link";

import { Button } from "@/components/ui/button";

export default async function AuthCodeError({
  searchParams,
}: {
  // A promise in Next 16 — synchronous access was removed.
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-8 py-24 text-center">
      <p className="eyebrow mb-3">
        Something went sideways
      </p>
      <h1 className="mb-4 font-heading text-section-title">
        We couldn&rsquo;t sign you in
      </h1>
      <p className="mb-8 text-ink-muted">
        {reason ?? "The sign-in link expired or was already used."}
      </p>
      <Button asChild>
        <Link href="/login">Try again</Link>
      </Button>
    </main>
  );
}
