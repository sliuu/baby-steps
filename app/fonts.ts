import { Outfit, Zilla_Slab } from "next/font/google";

// Stand-ins for Winden (display) and Axiforma (text). To use the licensed
// files: put the .woff2s in app/fonts/, swap to next/font/local, keep `variable`.
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
