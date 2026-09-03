"use client";

import { Archive, Trash2 } from "lucide-react";
import { useTransition } from "react";

import { deleteActivity, setArchived } from "@/app/actions/activities";
import { Button } from "@/components/ui/button";

type Props = {
  activityId: string;
  name: string;
  /**
   * How many days this sticker is on right now.
   *
   * Passed down from the board rather than counted here or fetched, because the
   * board is already holding every placement for the calendar — and holding the
   * *optimistic* copy, so a mark dropped a second ago is in the number. It only
   * appears in the warning, and it's the whole reason the warning is worth
   * having: "this also removes 14 marks" is a different sentence from "are you
   * sure?".
   */
  markCount: number;
  /**
   * Whether the delete confirmation is showing.
   *
   * Owned by the dialog above rather than here, because the confirmation is two
   * things in two places — these buttons, and the red paragraph over the fields
   * — and a piece of state read by both belongs to the component containing
   * both. Same lifting-up as the highlight in `CalendarBoard`.
   */
  confirming: boolean;
  onConfirmingChange: (confirming: boolean) => void;
  /** Close the dialog. Both paths end with the sticker gone from the tray. */
  onDone: () => void;
  onError: (message: string) => void;
};

/**
 * The two ways to stop using a sticker, and the distance between them.
 *
 * They're offered together on purpose. Almost every "I don't do this any more"
 * is an archive: the row leaves the tray, the marks stay on the calendar, the
 * life area keeps its count, and it's one click to undo. Delete is for the
 * other case — the sticker made by mistake, the one you'd rather not see again
 * — and it takes every mark with it and cannot be undone.
 *
 * So archive is one click and delete is two, and the second click has to land
 * on a button that wasn't there a moment ago. That's why the confirmation
 * *replaces* this row instead of opening a second dialog on top of the first: a
 * confirm that appears under the cursor collects the same reflexive click that
 * opened it. Here the destructive button is somewhere the harmless one wasn't.
 */
export function StickerRetire(props: Props) {
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ ok: boolean; message?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) props.onDone();
      else props.onError(result.message ?? "That didn't work. Try again.");
    });
  }

  if (props.confirming) {
    return (
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => props.onConfirmingChange(false)}
        >
          Keep it
        </Button>
        {/* The only button in the app that ends data. It says what it does
            rather than "confirm" — by the time your eyes reach it, the question
            it's answering is above the fold of your attention. */}
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={pending}
          onClick={() => run(() => deleteActivity(props.activityId))}
        >
          {pending ? "Deleting…" : "Delete forever"}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => run(() => setArchived(props.activityId, true))}
      >
        <Archive strokeWidth={1.5} />
        {pending ? "Archiving…" : "Archive"}
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        // The label carries the sticker and the consequence, because this is
        // the one control where "which one was I on?" has no second chance.
        aria-label={`Delete ${props.name} and its ${props.markCount} mark${
          props.markCount === 1 ? "" : "s"
        }`}
        title="Delete forever"
        disabled={pending}
        onClick={() => props.onConfirmingChange(true)}
        className="text-ink-muted hover:text-destructive"
      >
        <Trash2 strokeWidth={1.5} />
      </Button>
    </div>
  );
}

/**
 * The sentence above the fields while a delete is being confirmed.
 *
 * Separate from the buttons because it goes somewhere else — the footer is a
 * row and this is a paragraph, and an explanation squeezed in beside two
 * buttons ends up too small to be the thing that stops you. It names the number
 * and then names the alternative, in that order: the count is what makes the
 * decision, and archiving is what most people actually wanted.
 */
export function DeleteWarning(props: { name: string; markCount: number }) {
  const { markCount: count } = props;

  return (
    <p className="rounded-md bg-ramp-red-soft px-2.5 py-2 text-[0.9rem]">
      Deleting <span className="font-medium">{props.name}</span>
      {count === 0 ? (
        <> can’t be undone.</>
      ) : (
        <>
          {" "}
          also removes {count} mark{count === 1 ? "" : "s"} from your calendar,
          and can’t be undone. Archiving keeps {count === 1 ? "it" : "them"} and
          only hides the sticker.
        </>
      )}
    </p>
  );
}
