import { ramp } from "@/lib/palette";
import type { StickerFace } from "@/lib/stickers";
import { cn } from "@/lib/utils";

type Props = {
  sticker: StickerFace;
  /**
   * Size and type-scale overrides. Nothing else — this is not a styling hook.
   *
   * It exists because the signed-out page draws stickers too, at 40–56px
   * instead of 26. `cn` merges rather than concatenates, so `size-14` here
   * replaces the `size-[26px]` below instead of racing it in the stylesheet.
   *
   * The point of the prop is that the *appearance* stays in one file. The tint,
   * the ring, the fallback colour, the emoji-font correction — a change to any
   * of those lands on the calendar, the tray, the day modal and the login page
   * at once, because all four render this component rather than its recipe.
   */
  className?: string;
};

/**
 * A pale circle outlined in its life area's colour, with the mark inside. The
 * same component renders on a day and in the tray — that's why it takes a
 * StickerFace, the three fields it actually draws, rather than a row from
 * either table. Nothing here knows where it sits, so there is no variant prop
 * and no second component to keep in step.
 *
 * It used to be a filled circle at the ramp's soft end, and the outline is what
 * let the fill get out of the way. A mark drawn in --ink was always legible on
 * that fill, and the ones that weren't are the ones this app can't recolour: an
 * emoji arrives with its own palette, and a mid-tone circle behind it competes
 * with every one of them. Moving the hue to a 1px ring keeps the area
 * identifiable — arguably more so, since a ring is the full colour rather than
 * a tint of it — and hands the middle of the circle back to whatever is drawn
 * there.
 *
 * Five saturated circles on one day would still shout over the date they're
 * annotating, which is the constraint that produced the soft rung in the first
 * place. A ring is a thin enough shape to wear the full hue without doing that.
 */
export function StickerMark(props: Props) {
  const { sticker } = props;
  const { tint, border } = ramp(sticker.colorKey);

  return (
    <span
      title={sticker.name}
      className={cn(
        "grid size-[26px] shrink-0 place-items-center rounded-full border text-[0.8rem] leading-none text-ink",
        tint,
        border,
        props.className,
      )}
    >
      {/* `font-emoji` is here to centre the glyph, not to choose a typeface.
          A line box takes its height and its baseline from the *first available
          font* — the first family the browser has installed, whether or not it
          contains the character being drawn. So a mark set in the body serif is
          positioned by the serif's ascent and descent while an emoji's ink is
          drawn by the emoji font's, and the two disagree: the glyph sits low in
          the circle. Naming the emoji font first makes the box and the ink come
          from the same metrics. Same lesson as the `+` in `NewStickerForm`,
          arriving from the other side — there the fix was to stop using a
          glyph, here it's to let the glyph's own font size the box.

          `translate-y` is the other half, and it's a magic number on purpose.
          Naming the emoji font first fixed *which* box the glyph is centred in;
          it can't fix that a box isn't ink. What gets centred is the font's
          ascent-plus-descent, and an emoji font reserves descent room its
          glyphs barely use — so the box's midpoint sits below the ink's and the
          mark rides high by the difference. There is no `align-items: optical`.
          Half a pixel down is the whole correction, chosen by eye at 26px, and
          it is font-specific: a mark that's a letter rather than an emoji takes
          the same strut now and gets nudged along with it. */}
      <span className="font-emoji translate-y-[0.5px]" aria-hidden="true">
        {sticker.mark}
      </span>
      <span className="sr-only">{sticker.name}</span>
    </span>
  );
}
