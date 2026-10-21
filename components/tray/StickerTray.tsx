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
  /** `from`: the tapped tile, for the fly-in. */
  onAdd: (sticker: LibrarySticker, from?: HTMLElement) => void;
  /** Where a tap lands, for labels: "today", "16/10". */
  addTo: string;
  /** "column": the day panel. "page": wide grid under Today. */
  layout: "column" | "page";
  /** The day panel and sheet: no heading or archive. */
  compact?: boolean;
  /** Desktop day panel: tap edits, adding is by drag. Elsewhere tap adds. */
  tapEdits?: boolean;
  /** Prefixes drag ids, so two mounted trays don't collide. */
  dragScope?: string;
  /** Today's tray: tap only, no dragging. */
  noDrag?: boolean;
};

/** Sticker bank by category. Presentational; the board owns state. */
export function StickerTray(props: Props) {
  const { selection, onSelect, compact } = props;
  const tileSize = props.layout === "page" ? "md" : "sm";
  // Today has no days to light, so no eyes.
  const highlights = props.layout !== "page";

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

  const tapEdits = !props.local && !!props.tapEdits;
  // The pencil badge, wherever a tap doesn't already edit.
  const manage = !props.local && !tapEdits;

  function toggle(next: Selection) {
    if (sameSelection(selection, next)) props.onClear();
    else onSelect(next);
  }

  return (
    <div className="flex flex-col gap-s4">
      {/* The way out of a highlight. No "stickers" label: the section says it. */}
      {!compact && highlights && props.label && (
        <p className="text-caption text-ink-muted">
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

      <div
        className={cn(
          "grid items-start gap-x-s6 gap-y-s5",
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
              onSelect={highlights ? () => toggle(categorySelection) : undefined}
              selected={highlights && sameSelection(selection, categorySelection)}
              // 64px tile, 44px mark.
              flush={props.layout === "page"}
            >
              {stickers.length === 0 && props.local && (
                <li className="py-s1 text-caption text-ink-muted">nothing here yet</li>
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
                    size={tileSize}
                    dragId={props.dragScope ? `${props.dragScope}:${sticker.id}` : sticker.id}
                    noDrag={props.noDrag}
                    payload={{ kind: "activity", activityId: sticker.id, face: faceOf(sticker) }}
                    onAdd={tapEdits ? () => setEditing(sticker.id) : (from) => props.onAdd(sticker, from)}
                    addLabel={tapEdits ? `edit ${sticker.name}` : `add ${sticker.name} to ${props.addTo}`}
                    selected={highlights && sameSelection(selection, stickerSelection)}
                    onSelect={highlights ? () => toggle(stickerSelection) : undefined}
                    onEdit={manage ? () => setEditing(sticker.id) : undefined}
                  />
                );
              })}

              {!props.local && (
                <NewTile
                  category={group.categoryName}
                  size={tileSize}
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

        {manage && !compact && archived.length > 0 && (
          <ArchivedGroup
            stickers={archived}
            onError={props.onError}
            size={tileSize}
            className="col-span-full"
          />
        )}
      </div>

      {/* Outside the grid: Radix portals the dialog anyway. */}
      {!props.local && open && (
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
  size: "sm" | "md";
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

      <ul className="mt-s2 flex flex-wrap gap-x-s1 gap-y-s2">
        {props.stickers.map((sticker) => (
          <ArchivedTile
            key={sticker.id}
            face={sticker}
            size={props.size}
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
