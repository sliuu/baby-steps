import { ramp } from "@/lib/palette";
import type { ActivitySticker } from "@/lib/queries/stickers";

type Props = {
  sticker: ActivitySticker;
};

/**
 * A pastel circle in its life area's colour with the mark in ink. The same
 * component renders on a day here and in the tray in Step 7 — that's why it
 * takes a sticker and knows nothing about where it sits.
 *
 * The fill is the soft end of the ramp, not the full hue. Five saturated
 * circles on one day shout over the date they're annotating; five tints read as
 * a quiet row you can still tell apart. The mark stays --ink either way, so
 * legibility never depends on the fill being light enough for white — the trap
 * that ate today's numeral in Step 5.
 */
export function StickerMark(props: Props) {
  const { sticker } = props;
  const { soft } = ramp(sticker.colorKey);

  return (
    <span
      title={sticker.name}
      className={`grid size-[26px] shrink-0 place-items-center rounded-full text-[0.8rem] leading-none text-ink ${soft}`}
    >
      <span aria-hidden="true">{sticker.mark}</span>
      <span className="sr-only">{sticker.name}</span>
    </span>
  );
}
