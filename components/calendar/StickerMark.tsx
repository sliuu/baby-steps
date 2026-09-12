import { MARK_ICON_SIZE, MARK_STROKE, iconFor } from "@/lib/icons";
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
 * **The border is now the thing it was holding the space for.** For two steps
 * it sat here at 1px and transparent, reserving room inside the 26px
 * border-box so that giving it a colour later would cost no reflow. That is
 * what this is: `border-sticker-edge` at 1.5px, plus `shadow-sticker`.
 *
 * A white rim and a soft shadow is what makes a coloured circle read as a
 * *sticker* rather than as a dot — it's the margin of backing paper left by a
 * die cut, which is the most recognisable thing about the object. See
 * `--sticker-edge` in globals.css for why it is hard-coded white rather than
 * `--surface`, and why the dark theme mixes it back.
 *
 * 1.5px and not 1px: a single pixel of rim around a 26px circle is visible
 * one sticker at a time and disappears in a grid, which is the same mistake
 * the old hue ring made. 1.5px reads as an edge at a glance and still leaves
 * 23px of tint to carry the hue. Not 2px — at that width the rim starts
 * competing with the fill for the circle, and the mark inside loses its
 * ground.
 *
 * The box does not move. `size-[26px]` is the border-box and the border was
 * always in the class list, so every row of marks lays out exactly where it
 * did; what changed is that 1.5px of it is now paper instead of nothing.
 *
 * **A mark is one of two things, and this is the only place that decides.** It
 * can name an icon — `icon:dumbbell`, drawn by Lucide out of `lib/icons.ts` —
 * or it can be a single grapheme, drawn by a font. The first is the only thing
 * the picker offers now; the second is a typed letter, and every emoji anyone
 * made before the icons arrived. That second branch is not legacy code waiting
 * to be deleted — it is what keeps rows written a year ago drawing exactly as
 * they did, down to the half-pixel nudge below.
 *
 * The icon inherits `text-ink` through `currentColor`, which is the whole
 * answer to "what colour is it": one flat ink on a 45% tint, on every hue, in
 * both themes. Colouring it in the hue instead was the obvious idea and is the
 * wrong one — full red on a 45% red tint is about 2:1, which is not a contrast
 * ratio a 1px stroke can survive.
 */
export function StickerMark(props: Props) {
  const { sticker } = props;
  const { tint } = ramp(sticker.colorKey);
  const icon = iconFor(sticker.mark);

  return (
    <span
      title={sticker.name}
      className={cn(
        "grid size-[26px] shrink-0 place-items-center rounded-full border-[1.5px] border-sticker-edge text-[0.8rem] leading-none text-ink shadow-sticker",
        tint,
        props.className,
      )}
    >
      {icon ? (
        // One size rule and one stroke weight, both from `lib/icons.ts`, so a
        // 26px circle on a Tuesday and a 56px one behind the login page draw
        // the same picture at the same relative size. There is no
        // `translate-y` on this branch: an icon is centred in its own box, and
        // the half-pixel below exists for a problem — a glyph positioned by
        // font metrics it does not fill — that an SVG simply does not have.
        <icon.Icon
          className={MARK_ICON_SIZE}
          strokeWidth={MARK_STROKE}
          aria-hidden="true"
        />
      ) : (
        /* `font-emoji` is here to centre the glyph, not to choose a typeface.
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
            the same strut now and gets nudged along with it. */
        <span className="font-emoji translate-y-[0.5px]" aria-hidden="true">
          {sticker.mark}
        </span>
      )}
      <span className="sr-only">{sticker.name}</span>
    </span>
  );
}
