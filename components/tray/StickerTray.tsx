"use client";

import { ChevronRight } from "lucide-react";
import { useState } from "react";

import { EditStickerForm } from "@/components/tray/EditStickerForm";
import { MoodPicker } from "@/components/tray/MoodPicker";
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
  /** "rail": one column beside the calendar, with the moods. "page": wide grid under Today. */
  layout: "rail" | "page";
  /** Just the bank: no heading, moods, highlight, editing or archive. For plan 09's panel. */
  compact?: boolean;
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
  const rail = props.layout === "rail";

  function toggle(next: Selection) {
    if (sameSelection(selection, next)) props.onClear();
    else onSelect(next);
  }

  return (
    // Rail: the header stays put and the list below scrolls (see the board's aside).
    <div className="flex flex-col gap-6 lg:min-h-0">
      {!compact && (
        <header className="lg:shrink-0">
          <h2 className="font-sans text-label text-ink">your stickers</h2>
          {/* Doubles as the way out of a highlight. */}
          <p className="mt-1 text-caption text-ink-muted">
            {props.label ? (
              <>
                showing <span className="text-ink">{props.label}</span> ·{" "}
                <button
                  type="button"
                  onClick={props.onClear}
                  className="underline underline-offset-2 hover:text-ink"
                >
                  clear
                </button>
              </>
            ) : (
              `tap one to add it to ${props.addTo}, or drag it onto a day`
            )}
          </p>
        </header>
      )}

      {/* Vertical scroll only in the rail; long names truncate. */}
      <div
        className={cn(
          "grid items-start gap-x-10 gap-y-7",
          rail
            ? "scrollbar-app lg:min-h-0 lg:overflow-y-auto lg:pr-2"
            : "sm:grid-cols-2 lg:grid-cols-3",
        )}
      >
        {/* Rail only: Today already has its own mood row. */}
        {rail && !compact && (
          <MoodPicker
            className="hidden lg:block"
            selected={selection?.kind === "mood" ? selection.mood : null}
            onToggle={(mood) => toggle({ kind: "mood", mood })}
          />
        )}

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
              onSelect={compact ? undefined : () => toggle(categorySelection)}
              selected={sameSelection(selection, categorySelection)}
            >
              {stickers.length === 0 && !manage && (
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
                    dragId={sticker.id}
                    payload={{ kind: "activity", activityId: sticker.id, face: faceOf(sticker) }}
                    onAdd={() => props.onAdd(sticker)}
                    addLabel={`add ${sticker.name} to ${props.addTo}`}
                    selected={sameSelection(selection, stickerSelection)}
                    onSelect={compact ? undefined : () => toggle(stickerSelection)}
                    onEdit={manage ? () => setEditing(sticker.id) : undefined}
                  />
                );
              })}

              {manage && (
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
