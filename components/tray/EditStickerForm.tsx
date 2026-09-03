"use client";

import { useState } from "react";

import { updateActivity } from "@/app/actions/activities";
import { StickerFields, type FormArea } from "@/components/tray/StickerFields";
import {
  DeleteWarning,
  StickerRetire,
} from "@/components/tray/StickerRetire";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { LibrarySticker } from "@/lib/queries/activities";

type Props = {
  /**
   * The sticker as the *library* holds it, not as a day holds it.
   *
   * `LibrarySticker` and `ActivitySticker` both have an `id` and both describe
   * the same circle, and they are not interchangeable: an `ActivitySticker` is
   * a *placement*, whose `id` identifies the row on a particular day and whose
   * `activityId` identifies the sticker. Editing writes to `activities`, so it
   * needs the library's id — the same confusion `lib/highlight.ts` documents
   * and the fixtures in `analytics.test.ts` are built to catch.
   */
  sticker: LibrarySticker;
  /** Which life area it currently sits in, so the dropdown opens on it. */
  lifeAreaId: string;
  areas: FormArea[];
  /** Days this sticker is on, for the delete confirmation. See `StickerRetire`. */
  markCount: number;
  /** Always true where this is rendered — the tray mounts it only while editing. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * The sticker editor. One of them for the whole tray, opened by clicking a row.
 *
 * It started as a pencil per row, each owning its own `Dialog`, because the row
 * was spoken for: it was a drag handle *and* a highlight toggle, and a third
 * meaning would have made all three ambiguous. Moving the highlight onto its own
 * eye freed the click, so the pencil had nothing left to do and went away — one
 * control per row instead of two, and a click on a thing with a name now opens
 * the thing with that name.
 *
 * With no trigger of its own it stopped needing to exist fifteen times. The tray
 * holds which sticker is being edited and mounts exactly one of these, which is
 * also what keeps `initial` honest: the dialog is mounted at the moment you open
 * it, from the sticker as the server currently has it. Nothing to reset, and
 * nothing to keep in sync.
 */
export function EditStickerForm(props: Props) {
  const { onOpenChange } = props;
  /**
   * Mid-delete, and deliberately not inside `StickerRetire`.
   *
   * The confirmation shows up in two places — the red paragraph over the fields
   * and the pair of buttons in the footer — so the flag belongs to the
   * component that contains both. Same lifting-up as the highlight in
   * `CalendarBoard`, for the same reason: two siblings needed one value.
   */
  const [confirming, setConfirming] = useState(false);
  /** A failure from archive or delete. The form has its own for saving. */
  const [problem, setProblem] = useState<string | null>(null);

  return (
    <Dialog
      open={props.open}
      onOpenChange={(next) => {
        onOpenChange(next);
        // Closing resets both. Radix unmounts the fields, so the form clears
        // itself; these two live above that boundary and would otherwise be
        // waiting on the next open — a dialog that reopens already asking you
        // to confirm a delete you walked away from is worse than one that
        // forgets.
        if (!next) {
          setConfirming(false);
          setProblem(null);
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Edit sticker</DialogTitle>
          <DialogDescription>
            Change its mark, its name, or where it belongs.
          </DialogDescription>
        </DialogHeader>

        {/* Above the fields rather than beside the buttons, so the thing that
            should stop you is the width of the dialog and not the width of a
            gap in a footer. */}
        {confirming && (
          <DeleteWarning
            name={props.sticker.name}
            markCount={props.markCount}
          />
        )}

        {problem && (
          <p
            role="status"
            className="rounded-md bg-ramp-red-soft px-2.5 py-2 text-[0.9rem]"
          >
            {problem}
          </p>
        )}

        {/* Mounted only while the dialog is open, which is what makes `initial`
            a starting value rather than something to keep in sync. Open it,
            type, cancel, open it again: the second mount reads the props fresh
            and the typing is gone, with no reset code anywhere. */}
        <StickerFields
          areas={props.areas}
          action={(formData) => updateActivity(props.sticker.id, formData)}
          initial={{
            name: props.sticker.name,
            mark: props.sticker.mark,
            lifeAreaId: props.lifeAreaId,
          }}
          // The same area, said twice on purpose: once as where the dropdown
          // opens, once as where this sticker's existing marks live. They start
          // equal and the first one moves — which is the entire question the
          // warning under the dropdown asks.
          historyArea={props.lifeAreaId}
          submitLabel="Save changes"
          pendingLabel="Saving…"
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
