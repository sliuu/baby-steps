"use client";

import { MoodFace } from "@/components/ui/Mood";
import type { CalendarChange } from "@/lib/changes";
import type { DayString } from "@/lib/dates";
import type { Highlight } from "@/lib/highlight";
import { MOOD_BG, MOOD_LABEL, MOODS } from "@/lib/moods";
import type { Mood } from "@/lib/moods";
import { cn } from "@/lib/utils";

type Props = {
  day: DayString;
  /** What's on the day, or null. Pressing it again clears it. */
  mood: Mood | null;
  onCommit: (change: CalendarChange) => void;
  /** Tray selection; unnamed faces fade (all five for an activity). Omitted in the sheet. */
  highlight?: Highlight | null;
  /** Word under each face; Today hides them. */
  labels?: boolean;
  /** Give Today’s larger faces the same paper edge as an activity sticker. */
  stickerBorder?: boolean;
  /** Once set, grey the other faces instead of ringing the chosen one. */
  greyOthers?: boolean;
  /** "sm": tray-sticker size, one row. */
  size?: "sm";
};

/** Five mood faces; pressing the set one clears it (`aria-pressed`, not radios). */
export function MoodRow(props: Props) {
  return (
    <div className={props.size === "sm" ? "flex gap-s2" : "grid grid-cols-5 gap-1"}>
      {MOODS.map((mood) => {
        const chosen = mood === props.mood;
        const faded =
          props.highlight && props.highlight.mood !== mood ? "opacity-35" : "";
        const label = MOOD_LABEL[mood].toLowerCase();
        const greyed = props.greyOthers && props.mood && !chosen;

        return (
          <button
            key={mood}
            type="button"
            aria-pressed={chosen}
            aria-label={label}
            onClick={() =>
              props.onCommit(
                chosen
                  ? { kind: "clearMood", day: props.day }
                  : { kind: "mood", day: props.day, mood },
              )
            }
            className={cn(
              "group/mood flex flex-col items-center gap-1.5 transition-[opacity,filter]",
              faded,
              greyed && "opacity-40 grayscale hover:opacity-100 hover:grayscale-0",
            )}
          >
            <span
              className={cn(
                "grid aspect-square place-items-center rounded-full transition-shadow",
                props.size === "sm" ? "size-sticker-sm" : "w-full max-w-11",
                MOOD_BG[mood],
                props.stickerBorder && "border-3 border-paper ring-1 ring-rule",
                chosen && !props.greyOthers
                  ? "inset-ring-2 inset-ring-accent-ink"
                  : "inset-ring-1 inset-ring-rule group-hover/mood:inset-ring-ink",
              )}
            >
              <MoodFace mood={mood} className="size-3/5" />
            </span>
            {props.labels !== false && (
              <span
                aria-hidden="true"
                className={`text-caption ${chosen ? "text-ink" : "text-ink-muted"}`}
              >
                {label}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
