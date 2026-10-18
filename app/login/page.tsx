import Link from "next/link";
import type { CSSProperties } from "react";

import { SignInButton } from "@/components/auth/SignInButtons";
import { StickerMark } from "@/components/calendar/StickerMark";
import { PageFrame } from "@/components/ui/PageFrame";
import { SheetHeader } from "@/components/ui/SheetHeader";
import { Logo } from "@/components/ui/Logo";
import { LOGO, PAGE_WIDTH } from "@/lib/layout";

// Copy is Stephanie's; keep it verbatim.
const STRUCK = ["habit tracker", "activity logger", "life manager"];

// One per colour, scattered: tilt and nudge per sticker.
const CLUSTER = [
  { name: "meditation", mark: "icon:sparkles", colorKey: "oxblood", place: "-rotate-6" },
  { name: "gym", mark: "icon:dumbbell", colorKey: "bottle", place: "translate-y-8 rotate-3" },
  { name: "deep work", mark: "icon:brain", colorKey: "mustard", place: "-translate-y-2 rotate-12" },
  { name: "piano", mark: "icon:piano", colorKey: "rose", place: "translate-x-6 rotate-6" },
  { name: "adventure", mark: "icon:mountain", colorKey: "sage", place: "translate-y-10 -rotate-3" },
  { name: "called home", mark: "icon:phone-call", colorKey: "plum", place: "translate-y-2 -rotate-12" },
];

/** Signed out: the welcome, three crossed-out labels, and sign in. */
export default function LoginPage() {
  const content = (
    <main className={`${PAGE_WIDTH} pt-12 pb-20 sm:pt-20`}>
      <div className="flex items-center justify-between gap-12">
        <div>
          <h1 className="animate-rise font-display text-display font-light text-ink sm:text-display-xl">
            welcome to <span className="text-accent-ink">baby steps!</span>
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
            <span className="block animate-after-strikes text-accent-ink">place to hang out</span>
          </p>
        </div>

        {/* Decoration: hidden from screen readers and phones. */}
        <div aria-hidden="true" className="hidden shrink-0 grid-cols-3 gap-6 pr-6 lg:grid">
          {CLUSTER.map(({ place, ...sticker }, step) => (
            <span
              key={sticker.name}
              className="animate-fall"
              style={{
                animationDelay: `calc(var(--sticker-start) + ${step} * var(--sticker-gap))`,
              }}
            >
              <StickerMark sticker={sticker} size="lg" className={`size-24 ${place}`} />
            </span>
          ))}
        </div>
      </div>

      <div className="mt-14 animate-rise border-t border-rule pt-10 [animation-delay:var(--hero-actions-delay)]">
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

  return (
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
}
