import Link from "next/link";
import type { CSSProperties } from "react";

import { SignInButton } from "@/components/auth/SignInButtons";
import { PageFrame } from "@/components/ui/PageFrame";
import { SheetHeader } from "@/components/ui/SheetHeader";
import { LOGO, PAGE_WIDTH } from "@/lib/layout";

// Copy is Stephanie's; keep it verbatim.
const STRUCK = ["habit tracker", "activity logger", "life manager"];

/** Signed out: the welcome, three crossed-out labels, and sign in. */
export default function LoginPage() {
  return (
    <PageFrame
      header={
        <SheetHeader
          start={
            <Link href="/" className={`${LOGO} text-subhead sm:text-heading`}>
              baby steps
            </Link>
          }
          end={<SignInButton provider="google" look="sm" />}
        />
      }
    >
      <main className={`${PAGE_WIDTH} pt-12 pb-20 sm:pt-20`}>
        <h1 className="font-display text-display font-light text-accent-ink sm:text-display-xl">
          welcome to baby steps!
        </h1>

        <p className="mt-8 font-display text-heading font-light text-ink">
          <span className="block">your guilt-free, come as you please, just for kicks,</span>
          {STRUCK.map((label, step) => (
            <span key={label} className="block text-ink-muted">
              <s className="relative no-underline">
                {label}
                {/* Draws once; reduced motion lands on the end state. */}
                <span
                  aria-hidden="true"
                  style={{ "--step": step } as CSSProperties}
                  className="absolute inset-x-0 top-1/2 h-0.5 origin-left animate-strike bg-accent-ink"
                />
              </s>
            </span>
          ))}
          <span className="block animate-after-strikes">place to hang out</span>
        </p>

        <p className="mt-11 text-body-lg text-ink">what have you been up to?</p>

        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
          <SignInButton provider="google" look="md" />
          <Link
            href="/demo"
            className="text-label text-ink-muted underline-offset-4 hover:text-ink hover:underline"
          >
            demo
          </Link>
        </div>

        {/* Existing GitHub accounts still need a way in. */}
        <p className="mt-4">
          <SignInButton provider="github" look="text" />
        </p>
      </main>
    </PageFrame>
  );
}
