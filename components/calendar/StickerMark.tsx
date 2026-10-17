import { MARK_STROKE, iconFor } from "@/lib/icons";
import { categoryColor } from "@/lib/palette";
import type { StickerFace } from "@/lib/stickers";
import { cn } from "@/lib/utils";

export type StickerSize = "lg" | "md" | "sm" | "xs";

// Literal classes so Tailwind generates them. xs gets a thinner edge.
const SIZE: Record<StickerSize, string> = {
  lg: "size-sticker-lg border-3",
  md: "size-sticker-md border-3",
  sm: "size-sticker-sm border-3",
  xs: "size-sticker-xs border-2",
};

type Props = {
  sticker: StickerFace;
  /** lg today · md day panel · sm tray · xs calendar cell. */
  size?: StickerSize;
  /** Layout only (opacity, lift, an off-scale size on the login page). */
  className?: string;
};

/** Category ink, paper edge, faint die-cut ring; icon in the `on` colour. */
export function StickerMark(props: Props) {
  const { sticker } = props;
  const color = categoryColor(sticker.colorKey);
  const icon = iconFor(sticker.mark);

  return (
    <span
      title={sticker.name}
      className={cn(
        "@container grid shrink-0 place-items-center rounded-full border-paper ring-1 ring-rule",
        SIZE[props.size ?? "sm"],
        color.ink,
        color.on,
        props.className,
      )}
    >
      {icon ? (
        <icon.Icon
          className="size-1/2"
          strokeWidth={MARK_STROKE}
          aria-hidden="true"
        />
      ) : (
        // Emoji font first so the line box uses its metrics; 0.5px nudge by eye.
        <span
          className="sticker-glyph font-emoji translate-y-[0.5px]"
          aria-hidden="true"
        >
          {sticker.mark}
        </span>
      )}
      <span className="sr-only">{sticker.name}</span>
    </span>
  );
}
