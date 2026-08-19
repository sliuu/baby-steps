import type { ReactNode } from "react";

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
      <h3 className="eyebrow">{props.label}</h3>
      <ul className="mt-2.5 flex flex-col gap-1.5">{props.children}</ul>
    </section>
  );
}

type RowProps = {
  /** The circle or face. Hidden from screen readers; the name below carries it. */
  visual: ReactNode;
  name: string;
};

/**
 * One row: the sticker, then its name.
 *
 * The visual is wrapped in aria-hidden rather than left to speak for itself.
 * Both StickerMark and MoodMark carry their own accessible name, which is right
 * on the grid where there's no text beside them — but here the name is printed
 * two millimetres away, and a screen reader would otherwise read "Gym, Gym".
 */
export function TrayRow(props: RowProps) {
  return (
    <li className="flex items-center gap-2.5">
      <span className="shrink-0" aria-hidden="true">
        {props.visual}
      </span>
      {/* min-w-0 again: truncate can't do anything to a flex item that refuses
          to shrink below its own text. A long name would overflow the rail. */}
      <span className="min-w-0 truncate text-[0.9rem]">{props.name}</span>
    </li>
  );
}
