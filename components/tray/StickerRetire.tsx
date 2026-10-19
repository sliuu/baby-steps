"use client";

import { Archive, Trash2 } from "lucide-react";
import { useTransition } from "react";

import { deleteActivity, setArchived } from "@/app/actions/activities";
import { Button } from "@/components/ui/button";

type Props = {
  activityId: string;
  name: string;
  /** Days it's on, from the board's optimistic map; quoted in the warning. */
  markCount: number;
  /** Lifted to the dialog: the buttons and the warning both read it. */
  confirming: boolean;
  onConfirmingChange: (confirming: boolean) => void;
  /** Close the dialog. Both paths end with the sticker gone from the tray. */
  onDone: () => void;
  onError: (message: string) => void;
};

/** Archive (one click) or delete (two); the confirm replaces this row, not a new dialog. */
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
      <div className="flex items-center gap-s1">
        <Button
          type="button"
          variant="text"
          size="sm"
          disabled={pending}
          onClick={() => props.onConfirmingChange(false)}
        >
          keep it
        </Button>
        {/* Says what it does, not "confirm". */}
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="rounded-full"
          disabled={pending}
          onClick={() => run(() => deleteActivity(props.activityId))}
        >
          {pending ? "deleting…" : "delete forever"}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="text"
        size="sm"
        disabled={pending}
        onClick={() => run(() => setArchived(props.activityId, true))}
      >
        <Archive strokeWidth={1.5} />
        {pending ? "archiving…" : "archive"}
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        // Names the sticker and the consequence.
        aria-label={`delete ${props.name} and its ${props.markCount} mark${
          props.markCount === 1 ? "" : "s"
        }`}
        title="delete forever"
        disabled={pending}
        onClick={() => props.onConfirmingChange(true)}
        className="text-ink-muted hover:text-destructive"
      >
        <Trash2 strokeWidth={1.5} />
      </Button>
    </div>
  );
}

/** Delete warning above the fields: the mark count, then the archive alternative. */
export function DeleteWarning(props: { name: string; markCount: number }) {
  const { markCount: count } = props;

  return (
    <p className="rounded-lg bg-accent-ink/10 text-accent-ink px-s1 py-s1 text-label">
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
