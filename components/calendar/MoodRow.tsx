"use client";

import { MoodMark } from "./MoodMark";
import type { CalendarChange } from "@/lib/changes";
import type { DayString } from "@/lib/dates";
import type { Highlight } from "@/lib/highlight";
import { MOOD_LABEL, MOODS } from "@/lib/moods";
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

/**
 * Five faces across, and the only place in the app that draws them this way.
 *
 * It was inline in `TodayView` until the sheet needed the same row. Two copies
 * of five buttons would have been five buttons that drift: the toggle rule
 * below is the subtle half of this component, and a second hand-written copy is
 * how one surface ends up with a mood you can set and not unset.
 *
 * **Five columns, always.** Wrapping four and one puts a lone face on its own
 * line, which reads as a different kind of thing rather than as the fifth of
 * five. The grid is fixed at five even where the container is narrow; the
 * faces shrink, the shape doesn't.
 *
 * **Pressing the mood already on the day clears it.** A phone has no hover and
 * no second control to spare, and "none" has to stay reachable or one mis-tap
 * is permanent — the day modal solves that with a sixth option and the popover
 * with a separate line, and neither shape fits five faces across a phone.
 * `aria-pressed` is what says this is a toggle rather than a radio: a radio
 * group promises exactly one selection and no way back to zero, which is the
 * opposite of what this does.
 */
export function MoodRow(props: Props) {
  return (
    <div className="grid grid-cols-5 gap-1">
      {MOODS.map((mood) => {
        const chosen = mood === props.mood;
        const faded =
          props.highlight && props.highlight.mood !== mood ? "opacity-35" : "";

        return (
          <button
            key={mood}
            type="button"
            aria-pressed={chosen}
            onClick={() =>
              props.onCommit(
                chosen
                  ? { kind: "clearMood", day: props.day }
                  : { kind: "mood", day: props.day, mood },
              )
            }
            className={`flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-lg transition-colors ${
              chosen ? "bg-secondary" : "hover:bg-ink/5"
            } ${faded}`}
          >
            {/* `MoodMark` carries its own "Mood: Great" for screen readers, so
                the visible word underneath is hidden from them to stop the
                button reading the label twice. */}
            <MoodMark mood={mood} />
            <span
              aria-hidden="true"
              className={`text-[0.69rem] leading-none ${
                chosen ? "text-ink" : "text-ink-muted"
              }`}
            >
              {MOOD_LABEL[mood]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
