import { Outfit, Zilla_Slab } from "next/font/google";

// Stand-ins for Winden/Axiforma; licensed: .woff2s in app/fonts/ + next/font/local.
export const display = Zilla_Slab({
  subsets: ["latin"],
  weight: ["300", "400"],
  variable: "--font-display-face",
  display: "swap",
});

export const text = Outfit({
  subsets: ["latin"],
  weight: ["300", "400"],
  variable: "--font-text-face",
  display: "swap",
});
