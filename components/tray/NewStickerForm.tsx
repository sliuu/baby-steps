"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { createActivity } from "@/app/actions/activities";
import { StickerFields, type FormArea } from "@/components/tray/StickerFields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Props = {
  areas: FormArea[];
  /**
   * Which area the dropdown opens on. Omitted by the tray's header `+`, which
   * has no area to guess.
   *
   * A starting value, not a lock — the dropdown is still there and still works.
   * The `+` on a life area is a shortcut through one field, not a different
   * form, and pinning the area would make it one.
   */
  defaultAreaId?: string;
};

/**
 * A `+` and the dialog behind it. One in the tray header, one per life area.
 *
 * The per-area ones came after the header's, and they're the same component
 * with one prop rather than a second: what changes is which area the form opens
 * on, which is a value. (The near miss is instructive — the pre-filled area
 * broke `StickerFields`'s rule for when to warn about moving past marks, because
 * that rule was inferring "this is an edit" from "an area is already chosen".
 * See `historyArea` there.)
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

  /** The area, when there is one, for the trigger's label and the seeded form. */
  const area = props.areas.find(
    (candidate) => candidate.id === props.defaultAreaId,
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
        <Button
          // Ghost and smaller on a heading, matching the eye beside it. The
          // header's `+` keeps its outline: it's the one you're meant to find
          // without hovering anything, and it has no neighbour to match.
          variant={area ? "ghost" : "outline"}
          size={area ? "icon-xs" : "icon-sm"}
          // Six of these in a rail, all identical to a screen reader unless the
          // area is in the name. Same problem the pencil had, same fix.
          aria-label={area ? `New sticker in ${area.name}` : "New sticker"}
          title={area ? `New sticker in ${area.name}` : "New sticker"}
          // On a heading it fades in with the eye, off the same `group/row`.
          // The header's `+` is always there — hiding the only unconditional
          // way to add a sticker behind a hover would be hiding the feature.
          className={
            area
              ? `shrink-0 self-center opacity-100
                 [@media(hover:hover)]:opacity-0
                 [@media(hover:hover)]:group-hover/row:opacity-100
                 [@media(hover:hover)]:focus-visible:opacity-100`
              : undefined
          }
        >
          <Plus strokeWidth={1.5} />
        </Button>
      </DialogTrigger>

      {/* No description, and `aria-describedby={undefined}` is what says that on
          purpose — Radix warns about a dialog with no description, on the
          assumption that a missing one is an oversight. It isn't here. The
          subtitle used to name the area you'd opened the `+` on, and the area is
          now the first field in the form, already filled in. A sentence
          describing the control directly beneath it is a sentence to read
          before you can start. */}
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="text-xl">New sticker</DialogTitle>
        </DialogHeader>

        <StickerFields
          areas={props.areas}
          action={createActivity}
          // Only the area is seeded; `historyArea` stays undefined, which is
          // what keeps this a create — a new sticker has no past marks to warn
          // about moving, however its dropdown started out.
          initial={
            area ? { name: "", mark: "", lifeAreaId: area.id } : undefined
          }
          submitLabel="Add sticker"
          pendingLabel="Adding…"
          onDone={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
