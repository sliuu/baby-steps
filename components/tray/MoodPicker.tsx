"use client";

import { useDraggable } from "@dnd-kit/core";

import { MoodMark } from "@/components/calendar/MoodMark";
import type { DragPayload } from "@/components/dnd/payload";
import { TRAY_INSET } from "@/lib/layout";
import { MOOD_LABEL, MOODS, type Mood } from "@/lib/moods";
import { wash } from "@/lib/palette";

type Props = {
  /** Which mood is lit, or null when the selection is something else. */
  selected: Mood | null;
  /** Always a mood; the tray decides whether picking the lit one means "clear". */
  onToggle: (mood: Mood) => void;
  /** Where it sits in the tray's grid. Full width, wherever that grid has columns. */
  className?: string;
};

/**
 * The five moods, across rather than down.
 *
 * They were five full-width tray rows, which is 170-odd pixels of rail spent on
 * a list that never changes and whose entries are one word each. As a row of
 * five it's about a third of that, and the six life areas — the part of the tray
 * that actually grows — start higher up the page.
 *
 * Not a `TrayGroup` full of `TrayRow`s any more, and the reason is the one
 * `ArchivedRow` already settled: what's left after you take the row apart is
 * small enough to write out plainly. A mood here has no eye, no editor, no
 * full-width hover band and no name beside it — a `variant` prop would be
 * switching off nearly all of `TrayRow` and then relaying it vertically. What
 * the two still share is the thing that matters, which is `DragPayload`.
 *
 * The one behaviour that genuinely changed with the shape: **clicking a mood
 * lights it.** In a life area that's the eye's job, because a sticker row has
 * three verbs — drag, edit, highlight — and the third always needs its own
 * control. A mood has two. There's nothing behind it to open, so its body was a
 * drag handle whose click did nothing at all, and handing that click to the
 * highlight is what lets the eye go. Which is also what makes five columns fit:
 * a 24px button under each face would not.
 */
export function MoodPicker(props: Props) {
  return (
    <section className={props.className}>
      {/* No eye beside this heading, same as before. "Mood" isn't a thing you
          can highlight — it names five things that each are. */}
      <h3 className={`eyebrow ${TRAY_INSET}`}>Mood</h3>

      {/* Five columns, always, rather than a wrapping flex row. `flex-wrap`
          would break 4 + 1 at the first width that doesn't fit, and a lone
          "Rough" on its own line reads as a different kind of thing. Equal
          columns just get narrower, and the labels truncate long before that
          matters — the longest is five characters.

          The rail is 18rem, which leaves about 54px a column. Underneath the
          calendar the tray is a multi-column grid and this section spans all of
          it, so the narrowest this ever gets is a phone's full page width. */}
      <ul className="mt-2 grid grid-cols-5">
        {MOODS.map((mood) => (
          <MoodChoice
            key={mood}
            mood={mood}
            selected={props.selected === mood}
            onToggle={() => props.onToggle(mood)}
          />
        ))}
      </ul>
    </section>
  );
}

function MoodChoice(props: {
  mood: Mood;
  selected: boolean;
  onToggle: () => void;
}) {
  // The payload is annotated rather than inferred so this stays checked against
  // the same union the drop handler reads. A bare object literal here would be
  // structurally fine and silently wrong the day the union changes.
  const payload: DragPayload = { kind: "mood", mood: props.mood };

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: props.mood,
    data: payload,
  });

  return (
    <li className="min-w-0">
      <button
        ref={setNodeRef}
        type="button"
        {...listeners}
        {...attributes}
        onClick={props.onToggle}
        // `aria-pressed` is back, and it belongs here for the reason it stopped
        // belonging on a sticker row: this click really is a toggle. On a
        // sticker the click became "open the editor", which is not a state, so
        // the pressed-ness moved to the eye along with the job.
        aria-pressed={props.selected}
        // No TRAY_INSET. That constant is what keeps a full-width band off the
        // circle at the rail's edge; these are five narrow cells in a grid, and
        // padding them by the rail's gutter would eat a fifth of each one. The
        // heading above still carries it, so the row starts on the same x.
        //
        // One background slot, three states, exactly as the tray rows do it —
        // two background classes in one string are resolved by the compiled
        // stylesheet's order, not by the order they were typed.
        className={`flex w-full touch-none flex-col items-center gap-1 rounded-md px-1 py-1.5 transition-opacity ${
          isDragging
            ? "opacity-35"
            : props.selected
              ? `${wash(null)} cursor-grab active:cursor-grabbing`
              : "cursor-grab hover:bg-ink/5 active:cursor-grabbing"
        }`}
      >
        {/* Hidden the same way `TrayRowFace` hides its circle: `MoodMark`
            names itself "Mood: Great" for the grid, where it sits alone on a
            date line with no words near it. Here the word is directly
            underneath, and the button's name would otherwise be "Mood: Great
            Great". */}
        <span aria-hidden="true">
          <MoodMark mood={props.mood} />
        </span>
        <span className="max-w-full truncate text-[0.69rem] leading-none">
          {MOOD_LABEL[props.mood]}
        </span>
      </button>
    </li>
  );
}
