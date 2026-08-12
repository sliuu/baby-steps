"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type Provider = "google" | "github";

export function SignInButtons() {
  // Which provider is mid-flight, so only that button shows a pending label.
  const [pending, setPending] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signIn(provider: Provider) {
    setPending(provider);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        // Where Supabase sends the browser once the provider is done. Built
        // from window.location so it's correct in dev and in production
        // without a second environment variable to forget.
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    // On success the browser has already left for the provider, so reaching
    // the next line at all means it failed.
    if (error) {
      setError(error.message);
      setPending(null);
    }
  }

  return (
    <div className="flex w-full flex-col gap-3">
      <Button
        size="lg"
        className="w-full"
        disabled={pending !== null}
        onClick={() => signIn("google")}
      >
        {pending === "google" ? "Taking you to Google…" : "Continue with Google"}
      </Button>

      <Button
        size="lg"
        variant="outline"
        className="w-full"
        disabled={pending !== null}
        onClick={() => signIn("github")}
      >
        {pending === "github" ? "Taking you to GitHub…" : "Continue with GitHub"}
      </Button>

      {error ? (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
