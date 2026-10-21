import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";

import { SignInButton } from "@/components/auth/SignInButtons";
import { Button } from "@/components/ui/button";
import { Flower } from "@/components/balance/Flower";
import { PageFrame } from "@/components/ui/PageFrame";
import { SheetHeader } from "@/components/ui/SheetHeader";
import { Logo } from "@/components/ui/Logo";
import type { Balance } from "@/lib/balance";
import { LOGO, PAGE_WIDTH } from "@/lib/layout";

// Copy is Stephanie's; keep it verbatim.
// Two strikes; `--strikes` in globals.css times the line after them.
const STRUCK = ["habit tracker", "life manager"];

// Every category full: the flower the app grows toward.
const PETALS = [
  { id: "spirituality", name: "spirituality", colorKey: "mustard" },
  { id: "exercise", name: "exercise", colorKey: "sage" },
  { id: "work", name: "work", colorKey: "slate" },
  { id: "creativity", name: "creativity & play", colorKey: "plum" },
  { id: "romance", name: "romance & adventure", colorKey: "rose" },
  { id: "friends", name: "friends & family", colorKey: "amber" },
];
const FULL: Balance = Object.fromEntries(PETALS.map(({ id }) => [id, 3 as const]));

/** Signed out: the welcome, two crossed-out labels, the demo and sign in. */
export default async function LoginPage() {
  const content = (
    <main className={`${PAGE_WIDTH} pt-s7 pb-s7`}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="animate-rise font-display text-display font-light text-ink sm:text-display-xl">
            welcome to <span className="font-normal">baby steps!</span>
          </h1>

          <p className="mt-s5 animate-rise font-display text-heading font-light text-ink [animation-delay:var(--hero-copy-delay)]">
            <span className="block">your guilt-free,</span>
            {STRUCK.map((label, step) => (
              <span key={label} className="block">
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
            <span className="block animate-after-strikes font-normal">place to find balance</span>
          </p>

          <div className="mt-s6 animate-rise-after">
            {/* Italic: the app asking, not describing. */}
            <p className="font-display text-subhead font-light italic text-ink-muted">
              what have you been up to?
            </p>

            {/* The demo is filled and last, since it asks nothing. */}
            <div className="mt-s3 flex flex-wrap items-center gap-x-s3 gap-y-s2">
              <SignInButton provider="google" look="md" />
              <Button asChild variant="filled" size="cta">
                <Link href="/demo">
                  take a look
                  <ArrowRight aria-hidden="true" strokeWidth={1.5} />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Labelled, so it shows the six categories; centred on the whole left column. Hidden from screen readers and phones. Petals bloom slower than the text. */}
        <div aria-hidden="true" className="mr-s6 hidden shrink-0 [--dur-hero:var(--dur-bloom)] lg:block">
          <Flower
            categories={PETALS}
            levels={FULL}
            ringClassName="stroke-rule-input"
            className="size-88"
          />
        </div>
      </div>
    </main>
  );

  const page = (
    <PageFrame
      header={
        <SheetHeader
          start={
            // Mark only: the headline already says the name.
            <Link href="/" className={LOGO}>
              <Logo markOnly />
            </Link>
          }
          end={<SignInButton provider="google" look="sm" />}
        />
      }
    >
      {content}
    </PageFrame>
  );

  // Dev only: the branch, and the jig with it, is dropped from production builds.
  if (process.env.NODE_ENV === "development") {
    const { LandingAnimationJig } = await import("@/components/auth/LandingAnimationJig");
    return <LandingAnimationJig>{page}</LandingAnimationJig>;
  }
  return page;
}
