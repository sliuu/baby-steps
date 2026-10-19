"use client";

import { ArchiveRestore } from "lucide-react";
import { useTransition } from "react";

import { setArchived } from "@/app/actions/activities";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  activityId: string;
  name: string;
  onError: (message: string) => void;
  className?: string;
};

/** Brings an archived sticker back. One click, no confirm; no optimistic update. */
export function RestoreStickerButton(props: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      aria-label={`bring ${props.name} back`}
      title={`bring ${props.name} back`}
      disabled={pending}
      className={cn("shrink-0 rounded-full bg-paper ring-1 ring-rule", props.className)}
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
