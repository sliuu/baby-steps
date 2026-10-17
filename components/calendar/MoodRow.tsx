"use client";

import { MoodFace } from "@/components/ui/Mood";
import type { CalendarChange } from "@/lib/changes";
import type { DayString } from "@/lib/dates";
import type { Highlight } from "@/lib/highlight";
import { MOOD_BG, MOOD_LABEL, MOODS } from "@/lib/moods";
import type { Mood } from "@/lib/moods";

type Props = {
  day: DayString;
  /** What's on the day, or null. Pressing it again clears it. */
  mood: Mood | null;
  onCommit: (change: CalendarChange) => void;
  /**
   * The resolved tray selection, or null. Every face the selection didn't name
   * fades — and when the selection is an *activity* rather than a mood, that is
   * all five of them, which is correct: the tray is asking "where did this
   * happen", and none of the answers are moods.
   *
   * Omitted in the sheet, which has no tray behind it to select from.
   */
  highlight?: Highlight | null;
};

/** Sets a day's mood: five coloured faces, always five columns. Pressing the set one clears it (hence `aria-pressed`, not radios). */
export function MoodRow(props: Props) {
  return (
    <div className="grid grid-cols-5 gap-1">
      {MOODS.map((mood) => {
        const chosen = mood === props.mood;
        const faded =
          props.highlight && props.highlight.mood !== mood ? "opacity-35" : "";
        const label = MOOD_LABEL[mood].toLowerCase();

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
            className={`group/mood flex flex-col items-center gap-1.5 ${faded}`}
          >
            <span
              className={`grid aspect-square w-full max-w-11 place-items-center rounded-full transition-shadow ${MOOD_BG[mood]} ${
                chosen
                  ? "inset-ring-2 inset-ring-accent-ink"
                  : "inset-ring-1 inset-ring-rule group-hover/mood:inset-ring-ink"
              }`}
            >
              <MoodFace mood={mood} className="size-3/5" />
            </span>
            <span
              aria-hidden="true"
              className={`text-caption ${chosen ? "text-ink" : "text-ink-muted"}`}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
