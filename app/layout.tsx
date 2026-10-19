import type { Metadata } from "next";
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
    // Light only until a dark theme is designed; THEME_INIT_SCRIPT is unused.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${display.variable} ${text.variable} h-full antialiased`}
    >
      {/* Extensions add attributes to <body>; suppression doesn't cascade from <html>. */}
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
