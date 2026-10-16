"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { createActivity } from "@/app/actions/activities";
import { StickerFields, type FormCategory } from "@/components/tray/StickerFields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Props = {
  categories: FormCategory[];
  /**
   * Which category the dropdown opens on. Omitted by the tray's header `+`, which
   * has no category to guess.
   *
   * A starting value, not a lock — the dropdown is still there and still works.
   * The `+` on a category is a shortcut through one field, not a different
   * form, and pinning the category would make it one.
   */
  defaultCategoryId?: string;
  /**
   * Something else to press. The tray's `+` is a round icon button, and the
   * day sheet's entry point is a dashed chip at the end of a wrapping row —
   * same dialog, same action, different shape of doorway.
   *
   * A node rather than a `variant` prop, because the two triggers have nothing
   * in common to parameterise: one is an icon, one is an icon and a word with a
   * dashed edge, and the tray's carries three hover rules about the row it sits
   * on. `DialogTrigger asChild` takes whatever it's handed, so the caller
   * describing its own button is both shorter and honest about that.
   */
  trigger?: React.ReactNode;
};

/**
 * A `+` and the dialog behind it. One in the tray header, one per category.
 *
 * The per-category ones came after the header's, and they're the same component
 * with one prop rather than a second: what changes is which category the form opens
 * on, which is a value. (The near miss is instructive — the pre-filled category
 * broke `StickerFields`'s rule for when to warn about moving past marks, because
 * that rule was inferring "this is an edit" from "a category is already chosen".
 * See `historyCategory` there.)
 *
 * Split in two on purpose, and the split is what made editing cheap. Everything
 * the form knows — what you've typed, what went wrong — lives in
 * `StickerFields`, which Radix mounts when the dialog opens and unmounts when
 * it closes. So closing the dialog *is* the reset: there is no clearing code,
 * no effect watching `open`, and no chance of reopening onto last time's
 * half-filled form or a stale error message.
 *
 * What's left here is a trigger, a title, and which action to call. `EditStickerForm`
 * is the same three things with different values, which is why the fields moved
 * to their own file rather than growing a `mode` prop.
 */
export function NewStickerForm(props: Props) {
  const [open, setOpen] = useState(false);

  /** The category, when there is one, for the trigger's label and the seeded form. */
  const category = props.categories.find(
    (candidate) => candidate.id === props.defaultCategoryId,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {/* An SVG rather than a "+" character. Flex centres a glyph's line box,
            not its ink, and a serif plus sits on the font's math axis a little
            below the middle of that box — so it reads low in a round button. A
            nudge would fix it for EB Garamond at one size and be wrong again in
            Georgia while the webfont is still loading. Drawn, it's centred by
            geometry in any font. */}
        {props.trigger ?? (
          <Button
            // Ghost and smaller on a heading, matching the eye beside it. The
            // header's `+` keeps its outline: it's the one you're meant to find
            // without hovering anything, and it has no neighbour to match.
            variant={category ? "ghost" : "outline"}
            size={category ? "icon-xs" : "icon-sm"}
            // Six of these in a rail, all identical to a screen reader unless the
            // category is in the name. Same problem the pencil had, same fix.
            aria-label={category ? `New sticker in ${category.name}` : "New sticker"}
            title={category ? `New sticker in ${category.name}` : "New sticker"}
            // On a heading it fades in with the eye, off the same `group/row`.
            // The header's `+` is always there — hiding the only unconditional
            // way to add a sticker behind a hover would be hiding the feature.
            className={
              category
                ? `shrink-0 self-center opacity-100
                   [@media(hover:hover)]:opacity-0
                   [@media(hover:hover)]:group-hover/row:opacity-100
                   [@media(hover:hover)]:focus-visible:opacity-100`
                : undefined
            }
          >
            <Plus strokeWidth={1.5} />
          </Button>
        )}
      </DialogTrigger>

      {/* No description, and `aria-describedby={undefined}` is what says that on
          purpose — Radix warns about a dialog with no description, on the
          assumption that a missing one is an oversight. It isn't here. The
          subtitle used to name the category you'd opened the `+` on, and the category is
          now the first field in the form, already filled in. A sentence
          describing the control directly beneath it is a sentence to read
          before you can start. */}
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="text-dialog-title">New sticker</DialogTitle>
        </DialogHeader>

        <StickerFields
          categories={props.categories}
          action={createActivity}
          // Only the category is seeded; `historyCategory` stays undefined, which is
          // what keeps this a create — a new sticker has no past marks to warn
          // about moving, however its dropdown started out.
          initial={
            category ? { name: "", mark: "", categoryId: category.id } : undefined
          }
          submitLabel="Add sticker"
          pendingLabel="Adding…"
          onDone={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
