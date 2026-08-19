"use client";

import type { ReactNode } from "react";

import { DraggableSticker } from "@/components/dnd/DraggableSticker";
import type { DragPayload } from "@/components/dnd/payload";
import { TRAY_INSET } from "@/lib/layout";

type Props = {
  label: string;
  /** One <li> per sticker. */
  children: ReactNode;
};

/**
 * A labelled section of the tray. It doesn't know whether it's holding
 * activities or moods — it takes a label and a list, which is why the same
 * component draws all six life areas and the mood row.
 */
export function TrayGroup(props: Props) {
  return (
    <section>
      {/* Inset to match the rows below it. The label has no highlight of its
          own, so this is purely so its first letter sits directly above the
          first circle it names. */}
      <h3 className={`eyebrow ${TRAY_INSET}`}>{props.label}</h3>
      {/* Small gap because each row now carries its own vertical padding — it's
          a hover band, not a line of text. The two together land on roughly the
          rhythm the tray had before it became draggable. */}
      <ul className="mt-2 flex flex-col gap-0.5">{props.children}</ul>
    </section>
  );
}

type FaceProps = {
  /** The circle or face. Hidden from screen readers; the name beside it carries it. */
  visual: ReactNode;
  name: string;
};

/**
 * The sticker and its name, side by side.
 *
 * Pulled out on its own because two places draw it: the row sitting in the
 * tray, and the copy that follows the cursor while you drag. Those two have to
 * look identical — a lifted sticker that doesn't match the one you grabbed
 * reads as a different object — and the only way to guarantee that is for them
 * to be the same component.
 *
 * The visual is wrapped in aria-hidden rather than left to speak for itself.
 * Both StickerMark and MoodMark carry their own accessible name, which is right
 * on the grid where there's no text beside them — but here the name is printed
 * two millimetres away, and a screen reader would otherwise read "Gym, Gym".
 */
export function TrayRowFace(props: FaceProps) {
  return (
    <>
      <span className="shrink-0" aria-hidden="true">
        {props.visual}
      </span>
      {/* min-w-0 again: truncate can't do anything to a flex item that refuses
          to shrink below its own text. A long name would overflow the rail. */}
      <span className="min-w-0 truncate text-[0.9rem]">{props.name}</span>
    </>
  );
}

type RowProps = FaceProps & {
  /** Unique within the drag context: an activity's uuid, or a mood's name. */
  dragId: string;
  payload: DragPayload;
};

/** One row of the tray: a sticker you can pick up, and its name. */
export function TrayRow(props: RowProps) {
  return (
    <li className="flex">
      <DraggableSticker id={props.dragId} payload={props.payload}>
        <TrayRowFace visual={props.visual} name={props.name} />
      </DraggableSticker>
    </li>
  );
}
