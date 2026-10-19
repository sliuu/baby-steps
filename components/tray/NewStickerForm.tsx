"use client";

import { useState, type ReactNode } from "react";

import { createActivity } from "@/app/actions/activities";
import { StickerFields, type FormCategory } from "@/components/tray/StickerFields";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { LibraryGroup } from "@/lib/queries/activities";
import { suggestionsFor } from "@/lib/suggestions";

/** The groups as the form's categories, each with its unused suggestions. */
export function formCategories(groups: LibraryGroup[]): FormCategory[] {
  return groups.map((group) => ({
    id: group.categoryId,
    name: group.categoryName,
    colorKey: group.colorKey,
    suggestions: suggestionsFor(
      group.slug ?? "",
      group.stickers.map((sticker) => sticker.name),
    ),
  }));
}

type Props = {
  categories: FormCategory[];
  /** Where the category dropdown starts. Still changeable. */
  defaultCategoryId?: string;
  trigger: ReactNode;
};

/** Trigger + dialog; closing unmounts the fields, which is the reset. */
export function NewStickerForm(props: Props) {
  const [open, setOpen] = useState(false);
  const category = props.categories.find(
    (candidate) => candidate.id === props.defaultCategoryId,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{props.trigger}</DialogTrigger>

      {/* No description on purpose; the category is the first field. */}
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="text-body-lg">new sticker</DialogTitle>
        </DialogHeader>

        <StickerFields
          categories={props.categories}
          action={createActivity}
          // No `historyCategory`: a create has no marks to move.
          initial={
            category ? { name: "", mark: "", categoryId: category.id } : undefined
          }
          suggest
          submitLabel="add sticker"
          pendingLabel="adding…"
          onDone={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
