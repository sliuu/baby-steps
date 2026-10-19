"use client";

import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  /** What it lights, for the accessible name. */
  name: string;
  lit: boolean;
  onToggle: () => void;
  /** `icon-xs`, for group headings. */
  compact?: boolean;
  /** A 20px corner badge on a tray tile; hidden on touch. */
  badge?: boolean;
  className?: string;
};

/** Lights every day this appears on. `aria-pressed` toggle; hover-revealed, shown while lit. */
export function HighlightToggle(props: Props) {
  const Icon = props.lit ? EyeOff : Eye;
  const reveal = props.lit
    ? "opacity-100"
    : "opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/row:opacity-100 [@media(hover:hover)]:group-hover/tile:opacity-100 [@media(hover:hover)]:focus-visible:opacity-100";

  return (
    <Button
      type="button"
      size={props.compact ? "icon-xs" : "icon-sm"}
      variant="ghost"
      aria-pressed={props.lit}
      aria-label={`show ${props.name}'s days`}
      title={`show ${props.name}'s days`}
      onClick={props.onToggle}
      className={cn(
        "shrink-0 self-center",
        reveal,
        props.badge &&
          "hidden size-5 rounded-full bg-paper ring-1 ring-rule pointer-fine:grid [&_svg:not([class*='size-'])]:size-3",
        props.lit && props.badge && "text-ink",
        props.className,
      )}
    >
      <Icon strokeWidth={1.5} />
    </Button>
  );
}
