import { Plus } from "lucide-react";
import type { ComponentProps } from "react";

import { categoryColor } from "@/lib/palette";
import { cn } from "@/lib/utils";

type Props = Omit<ComponentProps<"button">, "type"> & {
  variant: "suggestion" | "chosen";
  /** The dot on a chosen chip. */
  colorKey?: string;
};

/** A toggle pill: a dashed "+ idea", or an ink pill once chosen. */
export function Chip({ variant, colorKey, className, children, ...props }: Props) {
  const chosen = variant === "chosen";
  return (
    <button
      type="button"
      aria-pressed={chosen}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-label transition-colors",
        chosen
          ? "border-ink text-ink"
          : "border-dashed border-rule-input text-ink-muted hover:border-ink hover:text-ink",
        className,
      )}
      {...props}
    >
      {chosen ? (
        <span
          aria-hidden="true"
          className={cn("size-2 rounded-full", categoryColor(colorKey ?? "").dot)}
        />
      ) : (
        <Plus className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
      )}
      {children}
    </button>
  );
}
