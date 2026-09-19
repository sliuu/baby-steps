import type { Metadata } from "next";
import { DM_Sans, Space_Mono, Syne } from "next/font/google";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

/**
 * The three faces, and why these three.
 *
 * This started as Cormorant over EB Garamond — a hairline display serif over a
 * book serif — then tried Merriweather over Karla, which fixed the fragility at
 * small sizes by making everything heavier and squarer than the app wanted.
 *
 * Instrument Serif was the third answer: a high-contrast masthead serif, one
 * weight, drawn to be set large. **Syne is the fourth**, and the first heading
 * face that isn't a serif — a wide, idiosyncratic display sans, so the titles
 * now differ from the body by shape and width rather than by serifs. DM Sans
 * underneath is still deliberately plain — a geometric grotesque with no
 * opinions, so the heading face is the only thing in the app doing any talking.
 *
 * **The headings are all set at 400.** Instrument Serif had no other weight, so
 * every heading call site had its weight utility removed and the dialog title
 * in `components/ui/dialog.tsx` went from `font-medium` to `font-normal`. Syne
 * does have real weights — it is loaded as a variable font, 400 to 800 on one
 * axis — so a `font-semibold` on a heading would now be a real instance rather
 * than a synthetic bold. None has been put back yet; that is a design decision
 * to take on purpose, not a side effect of the swap.
 *
 * DM Sans and Syne are both loaded as variable fonts — no `weight` array — so
 * `font-medium` and `font-semibold` resolve to real instances off the `wght`
 * axis rather than to separate files. Italics are not loaded for any of the
 * three because nothing in the app is set in them, and Syne has none to load.
 *
 * **Space Mono is the third, and it has exactly one job: the eyebrows.** The
 * small letterspaced caps that name a section — "MOOD", "WORK & STUDY", "MOST
 * DONE" — are labels rather than prose, and a mono is the face that says so.
 * Every glyph on the same advance is what makes a row of them read as a system
 * of tags instead of as very small writing, and its slab-ish, slightly
 * mechanical caps sit a long way from both the serif and the grotesque, so
 * three faces on one screen stay three clearly different jobs rather than
 * three shades of the same one.
 *
 * It ships 400 and 700, and only 400 is loaded — nothing sets an eyebrow bold,
 * and a weight nobody asks for is a file everybody downloads. It is *not* a
 * variable font, so that `weight` array is required rather than optional; drop
 * it and the request fails at build time rather than falling back quietly.
 *
 * It reaches the `eyebrow` utility through `--font-mono`, the Tailwind theme
 * token, which is why that token changed in globals.css rather than a fourth
 * one being invented. Nothing in the app wore `font-mono` before this — there
 * was no code or tabular anything — so the token was free.
 */
const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400"],
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
      className={`${syne.variable} ${dmSans.variable} ${spaceMono.variable} h-full antialiased`}
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
