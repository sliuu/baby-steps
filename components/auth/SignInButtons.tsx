"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type Provider = "google";

// Lowercase, like the rest of the voice.
const NAME: Record<Provider, string> = { google: "google" };

type Props = {
  provider: Provider;
  /** Same look; the words differ on purpose: "sm" (header) signs in, "md" (body) signs up. */
  look: "sm" | "md";
  className?: string;
};

/** One OAuth button. Shows its own pending label and error. */
export function SignInButton(props: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setPending(true);
    setError(null);
    const { error } = await createClient().auth.signInWithOAuth({
      provider: props.provider,
      // From window.location, so dev and prod both work.
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    // Success leaves the page; getting here means it failed.
    if (error) {
      setError(error.message);
      setPending(false);
    }
  }

  // Back/forward cache restores state without remounting: clear a stuck pending.
  useEffect(() => {
    const clear = () => setPending(false);
    window.addEventListener("pageshow", clear);
    return () => window.removeEventListener("pageshow", clear);
  }, []);

  const name = NAME[props.provider];
  const label = pending
    ? `taking you to ${name}…`
    : props.look === "sm"
      ? "sign in"
      : `sign up with ${name}`;

  return (
    <>
      <Button
        variant="outline"
        size="cta"
        disabled={pending}
        onClick={signIn}
        className={props.className}
      >
        {label}
      </Button>
      {error && (
        <p role="alert" className="basis-full text-label text-destructive">
          {error}
        </p>
      )}
    </>
  );
}
