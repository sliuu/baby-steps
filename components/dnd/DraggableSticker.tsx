"use client";

import { useDraggable } from "@dnd-kit/core";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { DragPayload } from "./payload";

type Props = {
  id: string;
  payload: DragPayload;
  /** Click or Enter. Space stays with the keyboard drag. */
  onActivate?: () => void;
  label?: string;
  className?: string;
  children: ReactNode;
};

/** A tray sticker: drag it onto a day, or tap to add. */
export function DraggableSticker(props: Props) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: props.id,
    data: props.payload,
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...listeners}
      {...attributes}
      onClick={props.onActivate}
      aria-label={props.label}
      className={cn(
        "touch-none",
        isDragging ? "opacity-35" : "cursor-grab active:cursor-grabbing",
        props.className,
      )}
    >
      {props.children}
    </button>
  );
}
