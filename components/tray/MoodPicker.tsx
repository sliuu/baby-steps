"use client";

import { useDraggable } from "@dnd-kit/core";

import { MoodMark } from "@/components/calendar/MoodMark";
import type { DragPayload } from "@/components/dnd/payload";
import { TRAY_INSET } from "@/lib/layout";
import { MOODS, type Mood } from "@/lib/moods";
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
 * The words are gone too now, and the faces carry the five apart on their own —
 * see the note on the button below, where the accessible name had to be handed
 * back to something once the visible word stopped providing it.
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
          face on its own line reads as a different kind of thing. Equal
          columns just get narrower, and there is nothing in them to truncate
          any more — a 20px face in a 1px-padded cell has a lot of room to lose
          before it stops fitting.

          The rail is 14rem, and the list inside it gives 8px to a scrollbar,
          which leaves about 43px a column for a 20px face. That is the ceiling
          the labels used to set: five of them wanted ~54px each, which is most
          of why the rail couldn't go under 18rem.
          Underneath the calendar the tray is a multi-column grid and this
          section spans all of it, so the narrowest this ever gets is a phone's
          full page width. */}
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
        // `flex-col` and its `gap-1` went with the label — one item needs no
        // column and no gap. `justify-center` replaces what `items-center` was
        // doing on the cross axis now that the axis has turned.
        className={`flex w-full touch-none items-center justify-center rounded-md px-1 py-1.5 transition-opacity ${
          isDragging
            ? "opacity-35"
            : props.selected
              ? `${wash(null)} cursor-grab active:cursor-grabbing`
              : "cursor-grab hover:bg-ink/5 active:cursor-grabbing"
        }`}
      >
        {/* **No word under the face, and no `aria-hidden` over it.** Those two
            go together and the second is the load-bearing half.

            The label was there because five mouths needed naming while the
            faces were new; the mouths turned out to carry it — a deep curve up
            and a deep curve down are not a distinction anyone needs a caption
            for, and "Great / Good" side by side were the two the word was
            doing the least for anyway. Dropping them is also what lets the
            rail get narrow: five labelled columns needed ~54px each, five
            faces need the 20px face plus its gutter.

            What the word *was* doing is naming the button, and losing that
            silently is how a picker becomes five identical "button"s to a
            screen reader. `MoodMark` already carries `sr-only` "Mood: Great"
            for exactly the case it meets in the grid — alone on a date line
            with no words near it — so the fix is to stop hiding it rather than
            to add anything. It was wrapped in `aria-hidden` only to stop the
            name reading "Mood: Great Great" while the visible word was there.
            No visible word, no duplicate, no wrapper. */}
        <MoodMark mood={props.mood} />
      </button>
    </li>
  );
}
