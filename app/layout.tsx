import type { Metadata } from "next";
import { DM_Sans, Instrument_Serif } from "next/font/google";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

/**
 * The two faces, and why these two.
 *
 * This started as Cormorant over EB Garamond — a hairline display serif over a
 * book serif — then tried Merriweather over Karla, which fixed the fragility at
 * small sizes by making everything heavier and squarer than the app wanted.
 *
 * Instrument Serif is the third answer and a different kind of face: a
 * masthead, not a paragraph. High contrast, one weight, drawn to be set large,
 * with enough confidence in a title that it doesn't need bold to carry. DM Sans
 * underneath is deliberately plain — a geometric grotesque with no opinions, so
 * the serif is the only thing in the app doing any talking.
 *
 * **Instrument Serif ships one weight, 400, and nothing here may ask for
 * another.** There is no 500 and no 600, so a `font-medium` or `font-semibold`
 * on a heading would get a synthetic bold: the browser smearing the outline
 * sideways, which on a high-contrast serif looks like a printing fault. Every
 * heading call site had its weight utility removed when this landed, and the
 * dialog title in `components/ui/dialog.tsx` went from `font-medium` to
 * `font-normal` for the same reason. If a face with real weights comes back,
 * those classes come back with it.
 *
 * DM Sans is loaded as a variable font — no `weight` array — so `font-medium`
 * and `font-semibold` in body copy resolve to real instances off the `wght`
 * axis rather than to separate files. Italics are not loaded for either face
 * because nothing in the app is set in them.
 */
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
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
      className={`${instrumentSerif.variable} ${dmSans.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
