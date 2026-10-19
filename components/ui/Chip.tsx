import type { ComponentProps } from "react";

import { categoryColor } from "@/lib/palette";
import { cn } from "@/lib/utils";

type Props = Omit<ComponentProps<"button">, "type"> & {
  variant: "suggestion" | "chosen";
  /** Colours the circle and, once chosen, the outline. */
  colorKey?: string;
};

/** A toggle pill: dashed with an open circle, or outlined in the category with a filled one. */
export function Chip({ variant, colorKey, className, children, ...props }: Props) {
  const chosen = variant === "chosen";
  const color = categoryColor(colorKey ?? "");
  return (
    <button
      type="button"
      aria-pressed={chosen}
      className={cn(
        "inline-flex h-8 items-center gap-s1 rounded-full border px-s2 text-label text-ink transition-colors",
        chosen ? color.border : "border-dashed border-rule hover:border-ink",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn("size-2.5 rounded-full border", color.border, chosen && color.dot)}
      />
      {children}
    </button>
  );
}
