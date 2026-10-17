"use client";

import { useState } from "react";

import { updateActivity } from "@/app/actions/activities";
import { StickerFields, type FormCategory } from "@/components/tray/StickerFields";
import {
  DeleteWarning,
  StickerRetire,
} from "@/components/tray/StickerRetire";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { LibrarySticker } from "@/lib/queries/activities";

type Props = {
  /** Library sticker, not a placement: `id` must be the activities row id. */
  sticker: LibrarySticker;
  categoryId: string;
  categories: FormCategory[];
  /** Days this sticker is on, for the delete confirmation. See `StickerRetire`. */
  markCount: number;
  /** Always true; the tray mounts it only while editing. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** The one sticker editor for the tray; mounted on open, so nothing to reset. */
export function EditStickerForm(props: Props) {
  const { onOpenChange } = props;
  /** Mid-delete. Lifted here: the warning and footer buttons both need it. */
  const [confirming, setConfirming] = useState(false);
  /** Archive/delete failure; the form has its own for saving. */
  const [problem, setProblem] = useState<string | null>(null);

  return (
    <Dialog
      open={props.open}
      onOpenChange={(next) => {
        onOpenChange(next);
        // Reset on close; these live above the unmounting fields.
        if (!next) {
          setConfirming(false);
          setProblem(null);
        }
      }}
    >
      {/* No description; tell Radix so it doesn't warn. */}
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="text-body-lg">edit sticker</DialogTitle>
        </DialogHeader>

        {/* Full width above the fields, not tucked in the footer. */}
        {confirming && (
          <DeleteWarning
            name={props.sticker.name}
            markCount={props.markCount}
          />
        )}

        {problem && (
          <p
            role="status"
            className="rounded-md bg-accent-ink/10 text-accent-ink px-2.5 py-2 text-label"
          >
            {problem}
          </p>
        )}

        {/* Mounted only while open, so `initial` needs no syncing. */}
        <StickerFields
          categories={props.categories}
          action={(formData) => updateActivity(props.sticker.id, formData)}
          initial={{
            name: props.sticker.name,
            mark: props.sticker.mark,
            categoryId: props.categoryId,
          }}
          // Same as `initial.categoryId` on purpose; the warning compares them.
          historyCategory={props.categoryId}
          submitLabel="save"
          pendingLabel="saving…"
          onDone={() => onOpenChange(false)}
          footerStart={
            <StickerRetire
              activityId={props.sticker.id}
              name={props.sticker.name}
              markCount={props.markCount}
              confirming={confirming}
              onConfirmingChange={setConfirming}
              onDone={() => onOpenChange(false)}
              onError={setProblem}
            />
          }
        />
      </DialogContent>
    </Dialog>
  );
}
