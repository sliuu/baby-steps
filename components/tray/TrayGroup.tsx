"use client";

import type { ReactNode } from "react";

import { StickerBar } from "@/components/calendar/StickerBar";
import { StickerMark } from "@/components/calendar/StickerMark";
import { DraggableSticker } from "@/components/dnd/DraggableSticker";
import type { DragPayload } from "@/components/dnd/payload";
import { HighlightToggle } from "@/components/tray/HighlightToggle";
import { TRAY_INSET } from "@/lib/layout";
import type { StickerFace } from "@/lib/stickers";

type Props = {
  label: string;
  /**
   * Lighting the whole area.
   *
   * Required, and it wasn't until the moods left. They were the one group with
   * no eye — a heading naming five separately highlightable things rather than
   * naming one — so this was optional and the component carried a whole
   * second heading for the case. `MoodPicker` draws them now, and an optional
   * prop nothing omits is a branch that can't be checked by using the app.
   */
  onSelect: () => void;
  selected: boolean;
  /** The wash a selected label carries, matching its stickers and its days. */
  wash: string;
  /**
   * A control belonging to the heading rather than to the highlight — the `+`
   * that makes a sticker in this area.
   *
   * Sits between the label and the eye, so the eye stays on the same right-hand
   * line every row in the tray puts it on. A slot for the reason `TrayRow` had
   * one: what goes in it owns a dialog.
   */
  action?: ReactNode;
  /** One <li> per sticker. */
  children: ReactNode;
};

/**
 * A labelled section of the tray: one life area, its stickers under it.
 *
 * It drew the mood group too until Step 16, on the strength of "it takes a
 * label and a list". That stopped being true when the moods became five columns
 * with no eye, no editor and no names beside them — at which point the shared
 * component was a label and a list *and three props the moods ignored*.
 */
export function TrayGroup(props: Props) {
  return (
    <section>
      {/* The heading went back to being a plain <h3>, and that's the swap
          reaching the top of the group.

          It used to *be* the button — a whole clickable label whose only job was
          the highlight. Now the eye beside it does that, so the heading is a
          heading again: a landmark for anyone navigating by headings, with no
          second meaning layered on it and no hover tint implying a click that
          no longer happens.

          `group/row` on the wrapper rather than on a row, because what the name
          actually means is "the band this eye belongs to" — the reveal rule is
          the same one every sticker uses, and the heading is a sibling of the
          <ul>, so nothing nests. The inset moves onto the wrapper so the label's
          first letter still sits directly above the first circle it names, and a
          lit area's wash spans the rail exactly like a row's. */}
      <div
        className={`group/row ${TRAY_INSET} flex items-center gap-2 rounded-md pr-2 ${
          props.selected ? props.wash : ""
        }`}
      >
        <h3 className="eyebrow min-w-0 flex-1 truncate">{props.label}</h3>
        {props.action}
        <HighlightToggle
          name={props.label}
          lit={props.selected}
          onToggle={props.onSelect}
          compact
        />
      </div>
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
 * A circle and its name, side by side.
 *
 * Pulled out on its own because three places draw it: a tray row while the
 * month is up, and the day modal twice — once down its sticker list and once
 * down its moods. Those have to look identical, and the only way to guarantee
 * that is for them to be the same component.
 *
 * The modal keeps this face in both views, unlike the tray. Its list is tick
 * boxes, and a tinted bar beside a checkbox reads as a control inside a
 * control when the checkbox is already the thing you press.
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
      <span className="min-w-0 truncate text-[0.83rem]">{props.name}</span>
    </>
  );
}

/**
 * Which drawing a row uses: the month's circle with a name beside it, or the
 * week's named bar. The same two words `DraggableMark` uses for the same two
 * shapes, so a grep for one finds both.
 */
type RowShape = "mark" | "bar";

/**
 * The row body, in whichever shape the calendar beside it is wearing.
 *
 * Shared by the live row and the archived one, because "a retired sticker
 * looks like a live one, minus the verbs" is the whole of `ArchivedRow`.
 */
function RowBody(props: { face: StickerFace; shape: RowShape }) {
  return props.shape === "bar" ? (
    <StickerBar sticker={props.face} />
  ) : (
    <TrayRowFace
      visual={<StickerMark sticker={props.face} />}
      name={props.face.name}
    />
  );
}

type RowProps = {
  /**
   * The sticker being drawn — the same three fields the week strip and the
   * thing under the cursor are drawn from, so all three are one object.
   */
  face: StickerFace;
  /** Circle or bar. `StickerTray` reads the view; a row is only told. */
  shape: RowShape;
  /** Unique within the drag context: an activity's uuid, or a mood's name. */
  dragId: string;
  payload: DragPayload;
  /** Lit — which the row now only *shows*. The eye is what changes it. */
  selected: boolean;
  wash: string;
  /** Lighting this row's days. Every row has one; only the body varies. */
  onSelect: () => void;
  /**
   * What clicking the row body does. Opening the editor, for a sticker.
   *
   * Omitted by the five moods, which have nothing behind them to open: they're
   * fixed by the CHECK constraint on `day_moods`, so there is no row in any
   * table to edit. Their body stays draggable and stays focusable, and does
   * nothing on Enter.
   */
  onActivate?: () => void;
  /** The row's accessible name, when it should say more than the visible text. */
  label?: string;
};

/**
 * A retired sticker: the same face, none of the verbs.
 *
 * Not a `TrayRow` with a `disabled` prop, and that's the decision worth
 * recording. `TrayRow` *is* a `DraggableSticker` — dragging and highlighting
 * aren't features it has, they're what it is — so the disabled version would be
 * a component whose whole body is switched off by a flag. What's left when you
 * take those away is one bar and one button, which is small enough to write out
 * plainly.
 *
 * The consequence is the useful part: there is no code path where an archived
 * sticker can be dropped on a day, because the thing that does the dropping was
 * never rendered.
 */
export function ArchivedRow(props: {
  face: StickerFace;
  shape: RowShape;
  action: ReactNode;
}) {
  return (
    <li className={`${TRAY_INSET} flex items-center gap-2.5 py-1 pr-2`}>
      {/* Dimmed as a group, so the rim and the shadow fade with the name. The
          colour still reads — it's the same area it always belonged to — just
          quieter than the stickers you can still reach for.

          Same shape as a live row, which is the point: a drawer of circles
          under a list of bars would read as a different kind of thing having
          been archived. What says these are retired is the fade and the
          missing verbs, not a second shape. */}
      <span className="flex min-w-0 flex-1 items-center gap-2.5 opacity-55">
        <RowBody face={props.face} shape={props.shape} />
      </span>
      {props.action}
    </li>
  );
}

/**
 * One row of the tray: a sticker you can pick up, open, and light.
 *
 * Three verbs on two elements, and which one got its own element is the whole
 * decision. Dragging and opening share the body, because dnd-kit's distance
 * threshold already tells a press from a drag and a click on a named thing
 * conventionally opens it. Highlighting is the third, and the third meaning is
 * always the one that needs its own control.
 *
 * **The body takes the calendar's shape.** With the week up, the row is the
 * identical rectangle the week strip stacks — tint, rim, shadow and all, the
 * name printed on the sticker rather than in a column beside it. With the
 * month up it is the month's circle with the name alongside. The rail is a
 * shelf of the things in the grid next to it, and a sticker you are about to
 * pick up should already look like what it will be once you put it down;
 * matching one view means mismatching the other, so it matches whichever is
 * there. It is the same rule the thing under the cursor already followed — see
 * `bar` in `CalendarBoard`.
 *
 * The band survives either way. The wash still paints the row when it's lit
 * and the hover tint still paints it on the way past — the body sits inside
 * the row's own inset, so against a bar both read as a halo around a rectangle
 * rather than as a second fill fighting the tint. That is the same picture a
 * lit Tuesday makes with a mark on it, and `wash()` is already the reason
 * those two colours separate: see the note there about the number being 35%.
 *
 * The bar needs no `aria-hidden` wrapper, and doesn't get one: it prints the
 * name as real text and its icon is already hidden, so there is only one name
 * to read. The "Gym, Gym" the circle has to dodge can't happen when the
 * picture and the word are one element.
 */
export function TrayRow(props: RowProps) {
  return (
    // `group/row` is named rather than bare, because the tray already nests
    // groups inside groups and an unnamed `group-hover` binds to the nearest
    // one — which would light every eye in a life area at once.
    //
    // `pr-2` matches TRAY_INSET on the other side, so the eye stops on the same
    // line the `+` in the header does. It's on the <li> rather than on the
    // button so the draggable keeps its own full-width hover band.
    <li className="group/row flex pr-2">
      <DraggableSticker
        id={props.dragId}
        payload={props.payload}
        selected={props.selected}
        wash={props.wash}
        onActivate={props.onActivate}
        label={props.label}
      >
        <RowBody face={props.face} shape={props.shape} />
      </DraggableSticker>
      <HighlightToggle
        name={props.face.name}
        lit={props.selected}
        onToggle={props.onSelect}
      />
    </li>
  );
}
