"use client";

import { X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import type { ReactNode } from "react";

import { DayPanel } from "./DayPanel";
import { DialogOverlay, DialogPortal } from "@/components/ui/dialog";
import type { CalendarChange } from "@/lib/changes";
import type { DayString } from "@/lib/dates";
import { NO_STICKERS, type StickersByDay } from "@/lib/stickers";
import { cn } from "@/lib/utils";

type Props = {
  /** Null is closed. */
  day: DayString | null;
  onClose: () => void;
  stickersByDay: StickersByDay;
  onCommit: (change: CalendarChange) => void;
  /** The compact tray for a day. */
  tray: (day: DayString, scope: string) => ReactNode;
  error: string | null;
};

/** The day panel as a bottom sheet, below lg. */
export function DaySheet(props: Props) {
  const day = props.day;
  const stickers = (day && props.stickersByDay.get(day)) || NO_STICKERS;

  return (
    <DialogPrimitive.Root
      open={day !== null}
      onOpenChange={(open) => {
        if (!open) props.onClose();
      }}
    >
      <DialogPortal>
        {/* Darker than a dialog's: a sheet shares an edge with the page. */}
        <DialogOverlay className="bg-ink/25" />

        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[85dvh] w-full max-w-136 flex-col gap-3",
            "rounded-t-2xl border-t border-rule bg-paper px-4.5 pt-2.5 pb-[calc(1.375rem+env(safe-area-inset-bottom))]",
            "shadow-[0_-10px_30px_rgb(70_50_20/0.14)] outline-none",
            "data-open:animate-sheet-in data-closed:animate-sheet-out",
          )}
        >
          {/* Grabber: affordance only. */}
          <span aria-hidden="true" className="mx-auto mb-1 h-1 w-10 shrink-0 rounded-full bg-rule" />

          <DialogPrimitive.Close
            aria-label="close"
            className="absolute top-4 right-4 z-10 grid size-8 place-items-center rounded-full bg-paper text-ink-muted ring-1 ring-rule transition-colors hover:text-ink"
          >
            <X className="size-4" strokeWidth={1.5} aria-hidden="true" />
          </DialogPrimitive.Close>

          {/* Radix hides the page's banner from screen readers; this copy is heard. */}
          <div role="status" aria-live="polite" className="sr-only">
            {props.error}
          </div>

          <div className="-mx-4.5 min-h-0 flex-1 overflow-y-auto px-4.5 pt-1 pb-1">
            {day !== null && (
              <DayPanel
                day={day}
                stickers={stickers}
                onCommit={props.onCommit}
                tray={props.tray(day, "sheet")}
                title={(date) => (
                  <DialogPrimitive.Title className="text-label text-ink-muted">
                    {date}
                  </DialogPrimitive.Title>
                )}
              />
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </DialogPrimitive.Root>
  );
}
