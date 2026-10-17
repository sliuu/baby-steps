import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// Our `--text-*` sizes, so `text-label` and `text-ink` don't cancel each other; sticker sizes so `size-24` wins.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      size: [{ size: ["sticker-lg", "sticker-md", "sticker-sm", "sticker-xs"] }],
    },
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
