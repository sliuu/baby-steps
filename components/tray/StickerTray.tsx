"use client";

import { ChevronRight } from "lucide-react";
import { useState } from "react";

import { EditStickerForm } from "@/components/tray/EditStickerForm";
import { NewStickerForm, formCategories } from "@/components/tray/NewStickerForm";
import { RestoreStickerButton } from "@/components/tray/RestoreStickerButton";
import { ArchivedTile, NewTile, TrayGroup, TrayTile } from "@/components/tray/TrayGroup";
import { sameSelection, type Selection } from "@/lib/highlight";
import { faceOf } from "@/lib/stickers";
import type { LibraryGroup, LibrarySticker } from "@/lib/queries/activities";
import { cn } from "@/lib/utils";

type Props = {
  groups: LibraryGroup[];
  /** What's lit, or null. Owned by the board. */
  selection: Selection | null;
  onSelect: (selection: Selection) => void;
  onClear: () => void;
  /** The selection's name, resolved by the board; null when nothing is lit. */
  label: string | null;
  /** Activity id → days it's on, for the delete confirmation. */
  markCounts: Map<string, number>;
  onError: (message: string) => void;
  /** Demo: no library writes, so no new/edit/restore. */
  local?: boolean;
  /** Tap (or Enter) on a sticker. */
  onAdd: (sticker: LibrarySticker) => void;
  /** Where a tap lands, for labels: "today", "16/10". */
  addTo: string;
  /** "column": the day panel. "page": wide grid under Today. */
  layout: "column" | "page";
  /** Just the bank: no heading, editing or archive. The day panel and sheet. */
  compact?: boolean;
  /** Prefixes drag ids, so two mounted trays don't collide. */
  dragScope?: string;
};

/** The sticker bank, grouped by category. Presentational: the board owns selection and commits. */
export function StickerTray(props: Props) {
  const { selection, onSelect, compact } = props;

  // An id, so a refresh after saving shows the new name and a delete closes it.
  const [editing, setEditing] = useState<string | null>(null);

  const categories = formCategories(props.groups);
  const archived = props.groups.flatMap((group) =>
    group.stickers.filter((sticker) => sticker.archived),
  );
  const open = props.groups.flatMap((group) =>
    group.stickers
      .filter((sticker) => sticker.id === editing)
      .map((sticker) => ({ sticker, categoryId: group.categoryId })),
  )[0];

  const manage = !props.local && !compact;

  function toggle(next: Selection) {
    if (sameSelection(selection, next)) props.onClear();
    else onSelect(next);
  }

  return (
    <div className="flex flex-col gap-6">
      {!compact && (
        <header>
          <h2 className="font-sans text-label text-ink">your stickers</h2>
          {/* The way out of a highlight. */}
          {props.label && (
            <p className="mt-1 text-caption text-ink-muted">
              showing <span className="text-ink">{props.label}</span> ·{" "}
              <button
                type="button"
                onClick={props.onClear}
                className="underline underline-offset-2 hover:text-ink"
              >
                clear
              </button>
            </p>
          )}
        </header>
      )}

      <div
        className={cn(
          "grid items-start gap-x-10 gap-y-7",
          props.layout === "page" && "sm:grid-cols-2 lg:grid-cols-3",
        )}
      >

        {props.groups.map((group) => {
          const categorySelection: Selection = {
            kind: "category",
            categoryId: group.categoryId,
          };
          const stickers = group.stickers.filter((sticker) => !sticker.archived);

          return (
            <TrayGroup
              key={group.categoryId}
              label={group.categoryName}
              colorKey={group.colorKey}
              onSelect={() => toggle(categorySelection)}
              selected={sameSelection(selection, categorySelection)}
            >
              {stickers.length === 0 && props.local && (
                <li className="py-2 text-caption text-ink-muted">nothing here yet</li>
              )}

              {stickers.map((sticker) => {
                const stickerSelection: Selection = {
                  kind: "activity",
                  activityId: sticker.id,
                };
                return (
                  <TrayTile
                    key={sticker.id}
                    face={sticker}
                    dragId={props.dragScope ? `${props.dragScope}:${sticker.id}` : sticker.id}
                    payload={{ kind: "activity", activityId: sticker.id, face: faceOf(sticker) }}
                    onAdd={() => props.onAdd(sticker)}
                    addLabel={`add ${sticker.name} to ${props.addTo}`}
                    selected={sameSelection(selection, stickerSelection)}
                    onSelect={() => toggle(stickerSelection)}
                    onEdit={manage ? () => setEditing(sticker.id) : undefined}
                  />
                );
              })}

              {!props.local && (
                <NewTile
                  category={group.categoryName}
                  trigger={(button) => (
                    <NewStickerForm
                      categories={categories}
                      defaultCategoryId={group.categoryId}
                      trigger={button}
                    />
                  )}
                />
              )}
            </TrayGroup>
          );
        })}

        {manage && archived.length > 0 && (
          <ArchivedGroup stickers={archived} onError={props.onError} className="col-span-full" />
        )}
      </div>

      {/* Outside the grid: Radix portals the dialog anyway. */}
      {manage && open && (
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
    </div>
  );
}

/** Retired stickers in a closed `<details>`; each can be brought back. */
function ArchivedGroup(props: {
  stickers: LibrarySticker[];
  onError: (message: string) => void;
  className?: string;
}) {
  return (
    <details className={cn("group/fold", props.className)}>
      <summary className="flex cursor-pointer list-none items-center gap-1.5 text-label text-ink-muted hover:text-ink">
        <ChevronRight
          strokeWidth={1.5}
          className="size-3.5 transition-transform group-open/fold:rotate-90"
          aria-hidden="true"
        />
        archived ({props.stickers.length})
      </summary>

      <ul className="mt-3 flex flex-wrap gap-x-2 gap-y-3">
        {props.stickers.map((sticker) => (
          <ArchivedTile
            key={sticker.id}
            face={sticker}
            action={
              <RestoreStickerButton
                activityId={sticker.id}
                name={sticker.name}
                onError={props.onError}
              />
            }
          />
        ))}
      </ul>
    </details>
  );
}
