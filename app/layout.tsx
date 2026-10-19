import type { Metadata } from "next";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

import { display, text } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Baby Steps",
  description:
    "Build habits slowly over time, watch and track your progress, and keep life balanced through the things that matter.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // The script sets `data-theme` before React hydrates; suppression lets that stand.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${display.variable} ${text.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      {/* Extensions add attributes to <body>; suppression doesn't cascade from <html>. */}
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
