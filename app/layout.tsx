import type { Metadata } from "next";
import { Schibsted_Grotesk, Spectral } from "next/font/google";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

/**
 * Two faces, and the second one is only ever italic.
 *
 * This started as Cormorant over EB Garamond — a hairline display serif over a
 * book serif — then tried Merriweather over Karla, which fixed the fragility at
 * small sizes by making everything heavier and squarer than the app wanted.
 * Instrument Serif was the third answer, a high-contrast masthead serif drawn
 * to be set large, and Syne over DM Sans was the fourth: a wide display sans
 * over a plain geometric one, three families deep once Space Mono arrived for
 * the labels.
 *
 * **Schibsted Grotesk is the fifth, and it is the whole app.** Headings and
 * body are the same family now — a neutral Scandinavian grotesque, variable
 * from 400 to 900 — so a title is distinguished from a paragraph by size and
 * by nothing else. That is a smaller claim than Syne was making and a
 * deliberate one: the app's voice is the stickers and the colour, and the
 * letterforms had started answering a question nobody asked.
 *
 * It runs *larger* than Syne, not smaller, which was the opposite of what the
 * swap expected: at a 100px em it gives 5% more x-height, 8% more cap and 11%
 * more width on the same string. So the heading rungs carry a 0.94 correction
 * — see the size block in `globals.css`, where the measurements are written
 * down. Two things in `lib/layout.ts` were resized by the same finding and are
 * commented there: `PAGE_TITLE`'s phone size, an arbitrary value rather than a
 * token, and `pill()`'s padding, where the extra width truncated one word in
 * the phone's bottom bar.
 *
 * **Space Mono is gone, and the labels came back into the family.** The
 * eyebrows and the weekday row were mono because a mono says "this is a tag,
 * not prose"; with one text face doing every other job, a third family for
 * eight words a screen was a download and a rule to remember. They are
 * Schibsted at small sizes now, and what makes them read as labels is the
 * uppercasing, the tracking and `--ink-label` rather than the face. Both
 * utilities took a size *up* on the way — a proportional face at a mono's
 * nominal size reads a rung smaller, because a mono spends its advance width
 * on air.
 *
 * **Spectral is the second face, and it is the first italic this app has ever
 * loaded.** One weight, one style: 300 italic, and nothing in the app can set
 * it upright or bold. It has exactly one job, the `note` utility, and the
 * things wearing it are the ones that are somebody *writing* rather than the
 * app reporting — the note under a day, the word for how a day felt, "Quiet"
 * on a day with nothing on it, "about every 11 days" under a habit. Every one
 * of those is a sentence in the first person or a reading offered softly, and
 * a light italic serif is the oldest way to say so. Everything that counts,
 * labels or names stays in the grotesque.
 *
 * It is *not* a variable font in the cut we want, so `weight` and `style` are
 * both required arrays rather than optional ones; drop either and the request
 * fails at build time rather than falling back quietly. Schibsted is variable
 * and so takes no `weight` at all, and `font-medium` or `font-semibold` on it
 * resolve to real instances off the `wght` axis.
 *
 * **The headings are still all set at 400.** Instrument Serif had no other
 * weight, so every heading call site lost its weight utility and the dialog
 * title in `components/ui/dialog.tsx` went from `font-medium` to
 * `font-normal`. Syne could have had one put back and never did; Schibsted is
 * the same story. Adding one is a design decision to take on purpose, not a
 * side effect of a swap.
 */
const schibsted = Schibsted_Grotesk({
  variable: "--font-schibsted",
  subsets: ["latin"],
  display: "swap",
});

const spectral = Spectral({
  variable: "--font-spectral",
  subsets: ["latin"],
  weight: ["300"],
  style: ["italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Baby Steps",
  // The same sentence the signed-out page leads with. It's the link preview
  // and the browser tab, so the two drifting apart would mean the app
  // describes itself one way in a shared link and another way on arrival.
  description:
    "Build habits slowly over time, watch and track your progress, and keep life balanced through the things that matter.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${schibsted.variable} ${spectral.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      {/* `suppressHydrationWarning` for the same reason it is on `<html>`,
          and it has to be repeated because React only suppresses one level
          deep — it does not cascade to children. Extensions inject attributes
          onto `<body>` before React hydrates (ColorZilla's
          `cz-shortcut-listen`, password managers' own markers), and React
          reports each one as a hydration mismatch the app cannot fix and did
          not cause. Suppressing here costs the ability to catch a real
          attribute mismatch on this one element, which is a fair trade for a
          tag that only ever carries two static classes. */}
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
