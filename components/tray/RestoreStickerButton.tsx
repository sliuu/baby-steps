"use client";

import { ArchiveRestore } from "lucide-react";
import { useTransition } from "react";

import { setArchived } from "@/app/actions/activities";
import { Button } from "@/components/ui/button";

type Props = {
  activityId: string;
  name: string;
  onError: (message: string) => void;
};

/**
 * Bring an archived sticker back to its life area.
 *
 * One click, no confirmation, and that asymmetry is the design: archiving is
 * reversible so it doesn't need a gate, and this is the reverse of a reversible
 * thing so it needs one even less. The only irreversible control in the app is
 * the delete inside the edit dialog, and it's the only one that asks.
 *
 * No optimistic update either, unlike a drop. `refresh()` re-renders the tray
 * on the server and the row moves from the archived section back up to its
 * area — which is a change of *where a thing is*, not of what it looks like.
 * Faking that would mean rendering the row in two places for the length of a
 * round trip.
 */
export function RestoreStickerButton(props: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={`Bring ${props.name} back`}
      title={`Bring ${props.name} back`}
      disabled={pending}
      className="shrink-0 self-center"
      onClick={() =>
        startTransition(async () => {
          const result = await setArchived(props.activityId, false);
          if (!result.ok) props.onError(result.message);
        })
      }
    >
      <ArchiveRestore strokeWidth={1.5} />
    </Button>
  );
}
