"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type Provider = "google";

const NAME: Record<Provider, string> = { google: "Google" };

type Props = {
  provider: Provider;
  /** "sm" in the header, "md" in the body. */
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
  // Phones: the header's button drops "with Google" to leave room for the logo.
  const label = pending ? (
    `Taking you to ${name}…`
  ) : (
    <>
      Sign in<span className={props.look === "sm" ? "max-sm:hidden" : undefined}> with {name}</span>
    </>
  );

  return (
    <>
      <Button
        variant="outline"
        size={props.look}
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
