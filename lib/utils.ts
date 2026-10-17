import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// Our `--text-*` sizes, so `text-label` and `text-ink` don't cancel each other.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: [
        "display-xl", "display", "display-sm", "heading", "subhead",
        "body-lg", "ui", "label", "caption",
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
