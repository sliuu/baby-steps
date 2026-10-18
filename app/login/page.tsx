import Link from "next/link";
import type { CSSProperties } from "react";

import { SignInButton } from "@/components/auth/SignInButtons";
import { Flower } from "@/components/balance/Flower";
import { PageFrame } from "@/components/ui/PageFrame";
import { SheetHeader } from "@/components/ui/SheetHeader";
import { Logo } from "@/components/ui/Logo";
import type { Balance } from "@/lib/balance";
import { LOGO, PAGE_WIDTH } from "@/lib/layout";

// Copy is Stephanie's; keep it verbatim.
const STRUCK = ["habit tracker", "activity logger", "life manager"];

// Every category full: the flower the app grows toward.
const PETALS = [
  { id: "spirituality", name: "spirituality", colorKey: "oxblood" },
  { id: "exercise", name: "exercise", colorKey: "bottle" },
  { id: "work", name: "work", colorKey: "mustard" },
  { id: "creativity", name: "creativity & play", colorKey: "rose" },
  { id: "romance", name: "romance & adventure", colorKey: "sage" },
  { id: "friends", name: "friends & family", colorKey: "plum" },
];
const FULL: Balance = Object.fromEntries(PETALS.map(({ id }) => [id, 3 as const]));

/** Signed out: the welcome, three crossed-out labels, and sign in. */
export default async function LoginPage() {
  const content = (
    <main className={`${PAGE_WIDTH} pt-12 pb-20 sm:pt-20`}>
      <div className="flex items-center justify-between gap-12">
        <div className="lg:mx-12">
          <h1 className="animate-rise font-display text-display font-light text-ink sm:text-display-xl">
            welcome to <span className="font-normal text-accent-ink">baby steps!</span>
          </h1>

          <p className="mt-8 animate-rise font-display text-heading font-light text-ink [animation-delay:var(--hero-copy-delay)]">
            <span className="block">your guilt-free,</span>
            <span className="block">come as you please,</span>
            <span className="block">just for kicks,</span>
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
            <span className="block animate-after-strikes font-normal text-accent-ink">place to find balance</span>
          </p>
        </div>

        {/* Decoration: hidden from screen readers and phones. */}
        <div aria-hidden="true" className="mr-12 hidden shrink-0 lg:block">
          <Flower
            categories={PETALS}
            levels={FULL}
            labels={false}
            ringClassName="stroke-rule-input"
            className="size-96"
          />
        </div>
      </div>

      <div className="mt-14 animate-rise border-t border-rule pt-10 lg:px-12 [animation-delay:var(--hero-actions-delay)]">
        <p className="font-display text-heading font-light text-ink sm:text-display-sm">
          what have you been up to?
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3">
          <SignInButton provider="google" look="md" />
          <Link href="/demo" className="text-ui text-ink underline underline-offset-4 hover:text-accent-ink">
            demo
          </Link>
        </div>
      </div>
    </main>
  );

  const page = (
    <PageFrame
      header={
        <SheetHeader
          start={
            <Link href="/" className={LOGO}>
              <Logo />
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
