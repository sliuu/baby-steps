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

  // `size="lg"` only sets a height, not a type scale — every variant inherits
  // `text-sm` from the base recipe — so the size that matches a 6xl heading has
  // to be asked for here. The height goes with it: `h-9` around `text-base` is
  // barely more than the cap height, and the button reads as cramped rather
  // than as large. These two classes travel together; changing one alone looks
  // like a mistake.
  const scale = "h-12 w-full text-base";

  return (
    <div className="flex w-full flex-col gap-3">
      <Button
        size="lg"
        className={scale}
        disabled={pending !== null}
        onClick={() => signIn("google")}
      >
        {pending === "google" ? "Taking you to Google…" : "Continue with Google"}
      </Button>

      <Button
        size="lg"
        variant="outline"
        className={scale}
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
