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
   * The point of the prop is that the *appearance* stays in one file. The fill,
   * the fallback colour, the emoji-font correction — a change to any of those
   * lands on the calendar, the tray, the day modal and the login page at once,
   * because all four render this component rather than its recipe.
   */
  className?: string;
};

/**
 * A circle filled with its life area's colour, with the mark inside. The same
 * component renders on a day and in the tray — that's why it takes a
 * StickerFace, the three fields it actually draws, rather than a row from
 * either table. Nothing here knows where it sits, so there is no variant prop
 * and no second component to keep in step.
 *
 * **The ring is gone, and this is the trade it makes.** For two steps this was
 * a near-white circle with a 1px outline in the full hue, on the argument that
 * an emoji arrives with its own palette and a mid-tone circle behind it
 * competes with every one of them — so the hue moved to the thinnest shape
 * that could carry it and handed the middle of the circle back.
 *
 * That argument was right about the emoji and wrong about the calendar. A ring
 * is only legible one sticker at a time; a month of them reads as a field of
 * identical pale discs with something coloured around the edge, and the whole
 * point of the six hues is that you can see the shape of a month without
 * reading it. A fill is a much larger target for the same information.
 *
 * So the fill came back at 45% — see `--sticker-fill` in globals.css — which
 * is deliberately short of the 48% soft rung that made the emoji fight its
 * background the first time. The ink mark clears 8.9:1 on every hue in light
 * and 4.8:1 in dark, and an emoji, which can't be recoloured, now sits on
 * something closer to paper than to the hue.
 *
 * The border stays in the class list at 1px and transparent, not removed. It
 * is holding the 26px box: `size-[26px]` is the border-box, so dropping the
 * border would shrink the drawn circle by 2px and reflow every row of marks.
 */
export function StickerMark(props: Props) {
  const { sticker } = props;
  const { tint } = ramp(sticker.colorKey);

  return (
    <span
      title={sticker.name}
      className={cn(
        "grid size-[26px] shrink-0 place-items-center rounded-full border border-transparent text-[0.8rem] leading-none text-ink",
        tint,
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
