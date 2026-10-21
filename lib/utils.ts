import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// Our text sizes (else `text-label` and `text-ink` clash) and sticker sizes.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      size: [{ size: ["sticker-lg", "sticker-md", "sticker-sm", "sticker-xs"] }],
    },
    theme: {
      text: [
        "display-xl", "display", "display-sm", "title", "page-title", "date", "heading", "subhead", "logo",
        "body-lg", "ui", "label", "caption",
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
