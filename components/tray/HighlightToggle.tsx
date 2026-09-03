"use client";

import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";

type Props = {
  /** What it lights, for the accessible name: a sticker, a mood, an area. */
  name: string;
  lit: boolean;
  onToggle: () => void;
  /** `icon-xs` instead of `icon-sm`, for the group headings. See below. */
  compact?: boolean;
};

/**
 * The eye at the right edge of a tray row: show me every day this appears on.
 *
 * This used to be the row itself. Clicking a sticker toggled the highlight, and
 * the only sign that it would was the row lighting up after you'd already done
 * it — a feature made entirely of a result. The row now opens the sticker's
 * editor, which is what a click on a named thing usually means, and the thing
 * that was never announced got a control that announces it.
 *
 * A real toggle button: stable accessible name, `aria-pressed` carrying the
 * state. The tempting alternative is to swap the label to "Stop showing…" when
 * it's on, and that is the mistake — a screen reader would then read the state
 * twice, once from the changed name and once from `aria-pressed`, and the two
 * are easy to get pointing opposite ways. Name says what it does; `aria-pressed`
 * says whether it's doing it. The icon is the sighted half of the same split.
 *
 * Hidden until hover, *except* while it's lit. The reveal is the pencil's rule
 * from Step 16 — `[@media(hover:hover)]` around the hiding, so a touch screen
 * where hover never fires doesn't get an invisible tap target on every row. The
 * exception is the important part: a control that turned something on has to
 * stay visible, or the only way out of the mode is a control you can't see.
 */
export function HighlightToggle(props: Props) {
  const Icon = props.lit ? EyeOff : Eye;

  return (
    <Button
      type="button"
      // `icon-xs` is 1.5rem against `icon-sm`'s 1.75rem. A group heading is a
      // 0.7rem eyebrow, so the row-sized button would set the heading's height
      // by itself and space the six areas further apart than the stickers
      // inside them.
      size={props.compact ? "icon-xs" : "icon-sm"}
      variant="ghost"
      aria-pressed={props.lit}
      // Possessive rather than "Highlight Gym", because the days are what
      // change — the sticker is already right there in front of you.
      aria-label={`Show ${props.name}'s days`}
      title={`Show ${props.name}'s days`}
      onClick={props.onToggle}
      className={`shrink-0 self-center ${
        props.lit
          ? "opacity-100"
          : `opacity-100
             [@media(hover:hover)]:opacity-0
             [@media(hover:hover)]:group-hover/row:opacity-100
             [@media(hover:hover)]:focus-visible:opacity-100`
      }`}
    >
      <Icon strokeWidth={1.5} />
    </Button>
  );
}
