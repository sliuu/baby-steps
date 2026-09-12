import { MARK_ICON_SIZE, MARK_STROKE, iconFor } from "@/lib/icons";
import { ramp } from "@/lib/palette";
import type { StickerFace } from "@/lib/stickers";
import { cn } from "@/lib/utils";

type Props = {
  sticker: StickerFace;
  /** Passed down for opacity and drag state — see `DraggableMark`. */
  className?: string;
};

/**
 * A sticker in the week strip: the same mark, the same colour, and the word.
 *
 * `StickerMark` is a 26px circle because a month cell is about 100px wide and
 * has to hold five of them next to a date and a mood. A week column is the
 * same width and holds one thing per row, so the space that was going sideways
 * is going into the name instead — and a sticker you can read is a different
 * object from a sticker you have to recognise.
 *
 * Everything else is deliberately identical, and now that includes the edge.
 * Same `tint` from the same `ramp()`, so a green sticker is the same green in
 * both views; same `MARK_ICON_SIZE` and `MARK_STROKE`, so the picture inside
 * is drawn with the same pen; and the same `border-sticker-edge` rim over the
 * same `shadow-sticker`, so a bar is the same *object* as a circle rather than
 * a flat tint that happens to share its colour. The border was already here at
 * 1px and transparent for exactly this — see `StickerMark`, which held the
 * same slot open for the same reason — so nothing in a column reflowed when
 * the paper appeared.
 *
 * `rounded-sm` rather than `rounded-md`, which is the one measurement that did
 * not carry over. 6.4px of radius on a 26px circle is nothing; on a 26px-tall
 * rectangle it is most of the way to a pill, and a die-cut sticker with a rim
 * around it reads as cut from a sheet, not stamped out. 4.8px keeps the corner
 * soft and lets the shape stay a rectangle.
 *
 * The two components are not variants of one component because nothing about
 * them is conditional — they are two shapes that agree on their colours, and a
 * `size` prop threading through both would hide that agreement rather than
 * state it.
 *
 * The name is real text here, not `sr-only`. That's the whole difference at
 * the accessibility layer too: the circle needs a label because the picture
 * isn't one, and the bar already says the word out loud.
 */
export function StickerBar(props: Props) {
  const { sticker } = props;
  const { tint } = ramp(sticker.colorKey);
  const icon = iconFor(sticker.mark);

  return (
    <span
      title={sticker.name}
      className={cn(
        "flex w-full items-center gap-1.5 rounded-sm border-[1.5px] border-sticker-edge px-1.5 py-[3px] text-[0.78rem] leading-[1.25rem] text-ink shadow-sticker",
        tint,
        props.className,
      )}
    >
      {icon ? (
        <icon.Icon
          className={`${MARK_ICON_SIZE} shrink-0`}
          strokeWidth={MARK_STROKE}
          aria-hidden="true"
        />
      ) : (
        <span className="font-emoji shrink-0" aria-hidden="true">
          {sticker.mark}
        </span>
      )}
      {/* `min-w-0` on the text and not on the row. A flex item's default
          `min-width: auto` refuses to shrink below its content, so without it
          a long name pushes the bar wider than the column instead of
          ellipsing — and the column is a grid track, which means every other
          day widens with it. */}
      <span className="min-w-0 truncate">{sticker.name}</span>
    </span>
  );
}
