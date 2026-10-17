"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Provider = "google" | "github";

const NAME: Record<Provider, string> = { google: "Google", github: "GitHub" };

type Props = {
  provider: Provider;
  /** "sm" in the header, "md" in the body. "text": a quiet link-style button. */
  look: "sm" | "md" | "text";
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
  const label = pending ? `Taking you to ${name}…` : `Sign in with ${name}`;

  return (
    <>
      {props.look === "text" ? (
        <button
          type="button"
          disabled={pending}
          onClick={signIn}
          className={cn(
            "text-label text-ink-muted underline-offset-4 hover:text-ink hover:underline disabled:opacity-60",
            props.className,
          )}
        >
          {label.toLowerCase()}
        </button>
      ) : (
        <Button
          variant="outline"
          size={props.look}
          disabled={pending}
          onClick={signIn}
          className={props.className}
        >
          {label}
        </Button>
      )}
      {error && (
        <p role="alert" className="basis-full text-label text-destructive">
          {error}
        </p>
      )}
    </>
  );
}
