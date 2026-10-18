"use client";

import { Check, Pencil, X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { useState } from "react";

import { StickerMark } from "@/components/calendar/StickerMark";
import { EditStickerForm } from "@/components/tray/EditStickerForm";
import { NewStickerForm, formCategories } from "@/components/tray/NewStickerForm";
import { NewTile, TrayGroup } from "@/components/tray/TrayGroup";
import { Button } from "@/components/ui/button";
import { DialogOverlay, DialogPortal } from "@/components/ui/dialog";
import type { LibraryGroup, LibrarySticker } from "@/lib/queries/activities";
import { cn } from "@/lib/utils";

type Props = {
  groups: LibraryGroup[];
  /** Activity ids already on the day. */
  placed: Set<string>;
  onAdd: (stickers: LibrarySticker[]) => void;
  onClose: () => void;
  /** Activity id → days it's on, for the delete confirmation. */
  markCounts: Map<string, number>;
  /** Demo: no library writes, so no new or edit. */
  local?: boolean;
};

/** Phones: pick several stickers and add them at once; or edit and create. Mounted only while open. */
export function AddStickersSheet(props: Props) {
  const [picked, setPicked] = useState<string[]>([]);
  // Edit mode: a tap opens the editor instead of picking.
  const [editMode, setEditMode] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const categories = formCategories(props.groups);
  const open = props.groups.flatMap((group) =>
    group.stickers
      .filter((sticker) => sticker.id === editing)
      .map((sticker) => ({ sticker, categoryId: group.categoryId })),
  )[0];

  const toggle = (id: string) =>
    setPicked((was) => (was.includes(id) ? was.filter((x) => x !== id) : [...was, id]));

  function add() {
    const byId = new Map(props.groups.flatMap((g) => g.stickers.map((s) => [s.id, s])));
    props.onAdd(picked.flatMap((id) => byId.get(id) ?? []));
    props.onClose();
  }

  return (
    <DialogPrimitive.Root
      open
      onOpenChange={(open) => {
        if (!open) props.onClose();
      }}
    >
      <DialogPortal>
        <DialogOverlay className="bg-ink/25" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[85dvh] w-full max-w-136 flex-col gap-3",
            "rounded-t-2xl border-t border-rule bg-paper px-4.5 pt-2.5 pb-[calc(1rem+env(safe-area-inset-bottom))]",
            "shadow-[0_-10px_30px_rgb(70_50_20/0.14)] outline-none",
            "data-open:animate-sheet-in data-closed:animate-sheet-out",
          )}
        >
          <span aria-hidden="true" className="mx-auto mb-1 h-1 w-10 shrink-0 rounded-full bg-rule" />
          <DialogPrimitive.Close
            aria-label="close"
            className="absolute top-4 right-4 z-10 grid size-8 place-items-center rounded-full bg-paper text-ink-muted ring-1 ring-rule transition-colors hover:text-ink"
          >
            <X className="size-4" strokeWidth={1.5} aria-hidden="true" />
          </DialogPrimitive.Close>

          <div className="flex items-baseline gap-4 pr-12">
            <DialogPrimitive.Title className="font-display text-body-lg text-ink">
              {editMode ? "edit stickers" : "add stickers"}
            </DialogPrimitive.Title>
            {!props.local && (
              <button
                type="button"
                onClick={() => setEditMode((was) => !was)}
                className="ml-auto text-label text-ink-muted underline-offset-4 hover:text-ink hover:underline"
              >
                {editMode ? "done editing" : "edit stickers"}
              </button>
            )}
          </div>

          <div className="-mx-4.5 flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4.5 py-1">
            {props.groups.map((group) => {
              const stickers = group.stickers.filter((sticker) => !sticker.archived);
              if (stickers.length === 0 && props.local) return null;
              return (
                <TrayGroup key={group.categoryId} label={group.categoryName} colorKey={group.colorKey} selected={false}>
                  {stickers.map((sticker) => {
                    const already = props.placed.has(sticker.id);
                    const on = !editMode && (already || picked.includes(sticker.id));
                    return (
                      <li key={sticker.id} className="w-16">
                        <button
                          type="button"
                          disabled={already && !editMode}
                          aria-pressed={editMode ? undefined : on}
                          aria-label={
                            editMode ? `edit ${sticker.name}` : already ? `${sticker.name}, already added` : sticker.name
                          }
                          onClick={() => (editMode ? setEditing(sticker.id) : toggle(sticker.id))}
                          className="relative flex w-full flex-col items-center gap-1.5 pt-1 disabled:opacity-45"
                        >
                          <StickerMark sticker={sticker} size="md" />
                          {editMode && (
                            <span
                              aria-hidden="true"
                              className="absolute top-0 right-0.5 grid size-5 place-items-center rounded-full bg-paper text-ink-muted ring-1 ring-rule"
                            >
                              <Pencil className="size-2.5" strokeWidth={1.75} />
                            </span>
                          )}
                          {on && (
                            <span
                              aria-hidden="true"
                              className="absolute top-0 right-0.5 grid size-5 place-items-center rounded-full bg-ink text-paper"
                            >
                              <Check className="size-3" strokeWidth={2} />
                            </span>
                          )}
                          <span aria-hidden="true" className="w-full truncate text-center text-caption text-ink">
                            {sticker.name}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                  {!props.local && (
                    <NewTile
                      category={group.categoryName}
                      size="md"
                      trigger={(button) => (
                        <NewStickerForm categories={categories} defaultCategoryId={group.categoryId} trigger={button} />
                      )}
                    />
                  )}
                </TrayGroup>
              );
            })}
          </div>

          {!editMode && (
            <Button
              type="button"
              variant="outline"
              size="md"
              disabled={picked.length === 0}
              onClick={add}
              className="w-full"
            >
              {picked.length === 0
                ? "pick stickers"
                : `add ${picked.length} sticker${picked.length === 1 ? "" : "s"}`}
            </Button>
          )}

          {open && (
            <EditStickerForm
              key={open.sticker.id}
              sticker={open.sticker}
              categoryId={open.categoryId}
              categories={categories}
              markCount={props.markCounts.get(open.sticker.id) ?? 0}
              open
              onOpenChange={(next) => {
                if (!next) setEditing(null);
              }}
            />
          )}
        </DialogPrimitive.Content>
      </DialogPortal>
    </DialogPrimitive.Root>
  );
}
