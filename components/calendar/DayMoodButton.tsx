"use client";

import { useState } from "react";

import { MoodMark } from "./MoodMark";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { CalendarChange } from "@/lib/changes";
import { formatDayLong, type DayString } from "@/lib/dates";
import { MOOD_LABEL, MOODS, type Mood } from "@/lib/moods";

type Props = {
  day: DayString;
  /** The mood already on the day. This control only exists when there is one. */
  mood: Mood;
  /** The fade a highlight puts on every mark it didn't select. */
  faded: string;
  onCommit: (change: CalendarChange) => void;
};

/**
 * The face on a day, and now the fastest way to change it.
 *
 * A mood is the one thing on a day you revise rather than add to — the day was
 * fine and then it wasn't, and the correction is a single field. Going through
 * the pencil for that means the whole day modal opens, with fifteen sticker
 * checkboxes and a full mood radio group, to move one value one notch. So the
 * face is its own control: click it, get five faces, pick one, done.
 *
 * A popover rather than a dialog, and the difference is the point. A dialog
 * takes the whole screen, traps focus, and dims the month behind it — correct
 * for "edit this day", far too much for "actually it was okay". A popover is
 * anchored to the thing it's about, closes on Escape or a click outside, and
 * leaves the calendar visible the entire time, so you can see the row of days
 * either side while deciding.
 *
 * It only appears where a mood already is, which is the honest consequence of
 * hanging it off the face: an empty day has no face to click. Adding the first
 * mood of a day is still the pencil's job. Worth saying out loud rather than
 * quietly making the trigger a permanent empty circle on all 42 cells — the
 * calendar's default state is "nothing recorded", and a grid of placeholders
 * would make the empty days look like the unfinished ones.
 */
export function DayMoodButton(props: Props) {
  const [open, setOpen] = useState(false);

  function choose(change: CalendarChange) {
    props.onCommit(change);
    // Closed by us rather than by Radix, because a `<button>` inside the
    // content isn't a menu item and nothing dismisses on its own. Picking a
    // mood is the whole interaction, so it ends when the pick lands.
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        // The name has to say the day as well as the mood. Forty-two of these
        // sit on one page and "Great" alone identifies none of them — the same
        // reason a placed sticker's label carries its date.
        aria-label={`Mood for ${formatDayLong(props.day)}: ${MOOD_LABEL[props.mood]}. Change it`}
        className={`rounded-full transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${props.faded}`}
      >
        {/* `MoodMark` names itself "Mood: Great", which is right on a bare grid
            cell and wrong inside a button that already has a fuller name. */}
        <span aria-hidden="true">
          <MoodMark mood={props.mood} />
        </span>
      </PopoverTrigger>

      {/* `w-auto` overrides the shadcn default of `w-72`. That width is sized
          for a form; this holds five faces and a line of text, and a popover
          wider than its content reads as one that failed to load the rest. */}
      <PopoverContent align="end" className="w-auto gap-2 p-2">
        <div className="grid grid-cols-5 gap-0.5">
          {MOODS.map((mood) => (
            <button
              key={mood}
              type="button"
              onClick={() =>
                choose({ kind: "mood", day: props.day, mood })
              }
              // A toggle's state, not a menu item's. The one already on the day
              // is shown pressed rather than hidden, so the popover says what
              // the day currently is as well as what it could be.
              aria-pressed={mood === props.mood}
              className={`flex flex-col items-center gap-1 rounded-md px-1.5 py-1.5 transition-colors ${
                mood === props.mood ? "bg-ink/10" : "hover:bg-ink/5"
              }`}
            >
              <span aria-hidden="true">
                <MoodMark mood={mood} />
              </span>
              <span className="text-[0.75rem] leading-none">
                {MOOD_LABEL[mood]}
              </span>
            </button>
          ))}
        </div>

        {/* Not a sixth mood — it deletes the row. Present for the same reason
            the modal's version is: most days have no mood, so "none" is a state
            you must be able to get back to, or one mis-click is permanent. */}
        <button
          type="button"
          onClick={() => choose({ kind: "clearMood", day: props.day })}
          className="rounded-md py-1 text-[0.85rem] text-ink-muted transition-colors hover:bg-ink/5 hover:text-ink"
        >
          Clear mood
        </button>
      </PopoverContent>
    </Popover>
  );
}
