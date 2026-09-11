"use client";

import { useRef, useState } from "react";

import type { CalendarChange } from "@/lib/changes";
import { formatDayLong, type DayString } from "@/lib/dates";
import { NOTE_MAX } from "@/lib/stickers";

type Props = {
  day: DayString;
  /** What's saved, or null for a day with no note. */
  note: string | null;
  onCommit: (change: CalendarChange) => void;
};

/** Show the counter only once it's about to matter. */
const COUNTER_FROM = NOTE_MAX - 40;

/**
 * Everything that decides how the text wraps, shared by the field and the
 * hidden twin that gives it its height. They have to wrap identically at every
 * width, so this is one string rather than two lists that look alike.
 */
const NOTE_TYPE = "w-full text-[0.78rem] leading-[1.15rem]";

/**
 * A line or two about the day, at the bottom of its column.
 *
 * **It saves when you leave it, not as you type.** A note is prose, and prose
 * is written by putting down a wrong word and replacing it — a keystroke is
 * not a decision the way dropping a sticker is. Saving per keystroke would
 * also mean a write per character through `useOptimistic` and a server action,
 * which is a lot of round trips to record a sentence nobody has finished. So:
 * type freely, and blur commits. Escape puts it back and lets go.
 *
 * The draft lives here rather than in the board's optimistic map for the same
 * reason. An in-progress sentence isn't calendar state; it's the state of one
 * textarea, and it should die with the textarea rather than survive an arrow
 * press to reappear on a different week.
 *
 * The one thing that has to be handled is the saved value changing underneath
 * an untouched field — which happens on every commit, because `useOptimistic`
 * hands down a new map. The `lastSaved` guard below is React's documented way
 * to do that: compare the prop against what it was on the previous render and
 * adopt the new one, during render, without an effect. It cannot clobber
 * typing, because typing doesn't change `props.note`.
 *
 * **The field grows with the note, and the column grows with the field.** A
 * textarea has a fixed number of rows and no opinion about its content, so the
 * height comes from a twin: a hidden `<span>` holding the same text, stacked in
 * the same grid cell. The span is in normal flow and sizes to its own wrapping,
 * the textarea is stretched to the cell, and the two agree because they are set
 * in the same face, size and leading. A grid row is as tall as its tallest
 * item, and the columns of `WeekGrid` stretch to their row — so a six-line
 * Thursday makes the whole week taller, and every note stays pinned to the
 * bottom of its own column.
 *
 * This is done in CSS rather than by measuring `scrollHeight` in an effect
 * because an effect runs after paint: a saved four-line note would render two
 * lines tall on the first frame and jump. It also has to survive the adopt
 * guard above, which changes `draft` without an `onChange` to hang a resize on.
 * `field-sizing: content` would replace the whole trick with one declaration
 * once it is safe to rely on everywhere.
 *
 * Two details keep the twin honest. The trailing space after `draft` is what
 * reserves a line for a trailing newline, which otherwise collapses and leaves
 * the caret outside the box. And every typographic class on the textarea has to
 * appear on the span as well — a change to one that misses the other shows up
 * as a field that is a line short exactly when the text is long.
 */
export function DayNote(props: Props) {
  const saved = props.note ?? "";

  const [draft, setDraft] = useState(saved);
  const [lastSaved, setLastSaved] = useState(saved);
  const field = useRef<HTMLTextAreaElement>(null);

  if (saved !== lastSaved) {
    setLastSaved(saved);
    setDraft(saved);
  }

  function commit() {
    const next = draft.trim();
    // The trim is applied to the field as well as to the write, so what you
    // see afterwards is what was actually stored. Without it a note that was
    // only ever whitespace looks like it saved and comes back empty.
    if (next !== draft) setDraft(next);
    if (next === saved) return;
    props.onCommit({ kind: "note", day: props.day, note: next });
  }

  const left = NOTE_MAX - draft.length;

  return (
    // A hairline above, and only above. The column already has edges; this rule
    // is saying that the space below it belongs to a different kind of thing
    // than the stickers above it.
    // `shrink-0` so the note is never the thing that gives. The column it sits
    // in is stretched to the tallest day of the week, and without this a short
    // day's note would be the part that absorbed the difference.
    <div className="mt-2 shrink-0 border-t border-hairline pt-1.5">
      <label className="sr-only" htmlFor={`note-${props.day}`}>
        Notes for {formatDayLong(props.day)}
      </label>

      {/* `min-h` is the old `rows={2}`: two lines of floor, so an empty day
          still looks like somewhere to write rather than a single slot. */}
      <div className="grid min-h-[2.3rem]">
        {/* The twin. `aria-hidden` and not focusable — it is a measurement, and
            a screen reader hitting the same sentence twice is a bug. */}
        <span
          aria-hidden="true"
          className={`${NOTE_TYPE} pointer-events-none invisible [grid-area:1/1] whitespace-pre-wrap break-words`}
        >
          {draft + " "}
        </span>

        <textarea
          id={`note-${props.day}`}
          ref={field}
          rows={1}
          // Hard-stopped at the same number the column's CHECK constraint uses,
          // so the limit is reached in the field rather than discovered by a
          // failed save with the sentence already typed.
          maxLength={NOTE_MAX}
          value={draft}
          placeholder="Note…"
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setDraft(saved);
              field.current?.blur();
            }
          }}
          // `overflow-hidden` matters: the box is now always exactly tall
          // enough, so a scrollbar could only ever appear for a frame and only
          // ever be wrong.
          className={`${NOTE_TYPE} [grid-area:1/1] resize-none overflow-hidden bg-transparent text-ink outline-none placeholder:text-ink-muted/70 focus-visible:placeholder:text-ink-muted`}
        />
      </div>

      {/* Only once you're near the wall, and `aria-live` off — a number that
          announces itself on every keystroke is worse than one you can ask
          for. The `maxLength` above is what actually enforces it. */}
      {draft.length >= COUNTER_FROM && (
        <p className="tabular text-right text-[0.69rem] leading-none text-ink-muted">
          {left}
        </p>
      )}
    </div>
  );
}
