"use client";

import { Pencil, Plus } from "lucide-react";
import type { ReactNode } from "react";

import { StickerMark } from "@/components/calendar/StickerMark";
import type { StickerSize } from "@/components/calendar/StickerMark";
import { DraggableSticker } from "@/components/dnd/DraggableSticker";
import type { DragPayload } from "@/components/dnd/payload";
import { HighlightToggle } from "@/components/tray/HighlightToggle";
import { categoryColor } from "@/lib/palette";
import type { StickerFace } from "@/lib/stickers";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  colorKey: string;
  /** Lights the whole category. */
  onSelect?: () => void;
  selected: boolean;
  /** One <li> per sticker. */
  children: ReactNode;
  /** Pulls the first mark's edge to the column's (its tile is wider than the mark). */
  flush?: boolean;
};

/** One category: coloured heading, then a wrap of sticker tiles. */
export function TrayGroup(props: Props) {
  return (
    <section>
      <div
        className={cn(
          "group/row -mx-s1 flex h-7 items-center gap-s1 rounded-sm px-s1",
          props.selected && categoryColor(props.colorKey).wash,
        )}
      >
        <h3 className="flex min-w-0 flex-1 items-center gap-s1 font-display text-ui text-ink lowercase">
          <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", categoryColor(props.colorKey).dot)} />
          <span className="truncate">{props.label}</span>
        </h3>
        {props.onSelect && (
          <HighlightToggle
            name={props.label}
            lit={props.selected}
            onToggle={props.onSelect}
            compact
          />
        )}
      </div>
      <ul className={cn("mt-s1 flex flex-wrap gap-x-s1 gap-y-s2", props.flush && "-ml-2.5")}>{props.children}</ul>
    </section>
  );
}

const TILE = "relative flex w-16 flex-col items-center gap-1.5";
const CAPTION = "w-full truncate text-center text-caption";

/** The mark and its caption, shared by live and archived tiles. */
function TileFace(props: { face: StickerFace; size?: StickerSize }) {
  return (
    <>
      <StickerMark
        sticker={props.face}
        size={props.size ?? "sm"}
        className="transition-transform duration-(--dur-menu-in) ease-(--ease-enter) group-hover/tile:-translate-y-px"
      />
      <span aria-hidden="true" className={cn(CAPTION, "text-ink")}>
        {props.face.name}
      </span>
    </>
  );
}

/** Small round badge on a tile's corner; hover/focus on desktop. */
const BADGE =
  "absolute top-0 grid size-5 place-items-center rounded-full bg-paper text-ink-muted ring-1 ring-rule transition-opacity hover:text-ink focus-visible:opacity-100 group-hover/tile:opacity-100 pointer-fine:opacity-0";

type TileProps = {
  face: StickerFace;
  size?: StickerSize;
  dragId: string;
  payload: DragPayload;
  noDrag?: boolean;
  /** Tap or Enter: add to the day. */
  onAdd?: (from: HTMLElement) => void;
  /** Accessible name for the add, e.g. "add gym to today". */
  addLabel: string;
  /** Lit by its eye. */
  selected: boolean;
  /** Lights its days. */
  onSelect?: () => void;
  /** Opens the editor; omitted in the demo and compact trays. */
  onEdit?: () => void;
};

/** A sticker in the tray: tap to add, drag onto a day, corner badges for edit and highlight. */
export function TrayTile(props: TileProps) {
  return (
    <li
      className={cn(
        TILE,
        "group/tile rounded-lg pb-1",
        props.selected && categoryColor(props.face.colorKey).wash,
      )}
    >
      <DraggableSticker
        id={props.dragId}
        payload={props.payload}
        onActivate={props.onAdd}
        disabled={props.noDrag}
        label={props.addLabel}
        className="flex w-full flex-col items-center gap-1.5 rounded-lg pt-1 pointer-coarse:touch-pan-y"
      >
        <TileFace face={props.face} size={props.size} />
      </DraggableSticker>

      {props.onSelect && (
        // Eye: top left. Touch has no highlight, so it stays hidden there.
        <HighlightToggle
          name={props.face.name}
          lit={props.selected}
          onToggle={props.onSelect}
          badge
          className="absolute top-0 left-0.5"
        />
      )}
      {props.onEdit && (
        <button
          type="button"
          onClick={props.onEdit}
          aria-label={`edit ${props.face.name}`}
          title={`edit ${props.face.name}`}
          className={cn(BADGE, "right-0.5")}
        >
          <Pencil className="size-2.5" strokeWidth={1.75} aria-hidden="true" />
        </button>
      )}
    </li>
  );
}

/** The dashed "+ new" tile at the end of a group. Wraps a dialog trigger. */
export function NewTile(props: {
  trigger: (button: ReactNode) => ReactNode;
  category: string;
  size?: Extract<StickerSize, "sm" | "md">;
}) {
  return (
    <li className={TILE}>
      {props.trigger(
        <button
          type="button"
          aria-label={`new sticker in ${props.category}`}
          className="group/new flex w-full flex-col items-center gap-1.5 pt-1"
        >
          <span
            className={cn(
              "grid place-items-center rounded-full border border-dashed border-rule-input text-ink-muted transition-colors group-hover/new:border-ink group-hover/new:text-ink",
              props.size === "md" ? "size-sticker-md" : "size-sticker-sm",
            )}
          >
            <Plus className="size-4" strokeWidth={1.5} aria-hidden="true" />
          </span>
          <span aria-hidden="true" className={cn(CAPTION, "text-ink-muted")}>
            new
          </span>
        </button>,
      )}
    </li>
  );
}

/** A retired sticker: faded tile, restore button in the corner. Not draggable. */
export function ArchivedTile(props: {
  face: StickerFace;
  action: ReactNode;
  size?: StickerSize;
}) {
  return (
    <li className={cn(TILE, "pt-1")}>
      <span className="flex w-full flex-col items-center gap-1.5 opacity-55">
        <TileFace face={props.face} size={props.size} />
      </span>
      <span className="absolute -top-1 right-0">{props.action}</span>
    </li>
  );
}
