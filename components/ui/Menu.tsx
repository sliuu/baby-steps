"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/** Stationery dropdown: raised paper, square corners, 1px rule. */
export const Menu = DropdownMenu;
export const MenuTrigger = DropdownMenuTrigger;

export function MenuContent({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuContent>) {
  return (
    <DropdownMenuContent
      className={cn(
        "w-56 rounded-2xl border border-rule bg-raised p-1.5 text-ink shadow-menu ring-0",
        className,
      )}
      {...props}
    />
  );
}

export function MenuItem({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuItem>) {
  return (
    <DropdownMenuItem
      className={cn(
        "rounded-full px-s2 py-s1 text-ui focus:bg-secondary focus:text-ink",
        className,
      )}
      {...props}
    />
  );
}

export function MenuLabel({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuLabel>) {
  return (
    <DropdownMenuLabel
      className={cn("px-s2 py-s1 text-caption font-normal text-ink-muted", className)}
      {...props}
    />
  );
}

export function MenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuSeparator>) {
  return <DropdownMenuSeparator className={cn("bg-rule", className)} {...props} />;
}
