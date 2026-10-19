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
  /** "page": Today's large field with a dashed rule and a counter. */
  variant?: "page";
};

/** Show the counter only once it's about to matter. */
const COUNTER_FROM = NOTE_MAX - 40;

/** Wrap-affecting classes, shared by field and twin so both wrap identically. */
const NOTE_TYPE = "note w-full text-caption leading-4.5";
const PAGE_TYPE = "w-full font-display text-body-lg font-light";

/**
 * Day note. Saves on blur or Enter, Escape reverts; draft is local, not board state.
 * Height comes from a hidden twin span in the same grid cell (CSS, no jump on
 * first paint). Trailing " " keeps a final newline's line.
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
    // Trim the field too, so it shows what was stored.
    if (next !== draft) setDraft(next);
    if (next === saved) return;
    props.onCommit({ kind: "note", day: props.day, note: next });
  }

  const left = NOTE_MAX - draft.length;
  const page = props.variant === "page";
  const type = page ? PAGE_TYPE : NOTE_TYPE;

  return (
    // `shrink-0`: the note never absorbs the column's stretch.
    <div className={page ? "" : "mt-s1 shrink-0 border-t border-rule-grid pt-1.5"}>
      <label className="sr-only" htmlFor={`note-${props.day}`}>
        Notes for {formatDayLong(props.day)}
      </label>

      {/* `min-h`: two-line floor. */}
      <div className={page ? "grid border-b border-dashed border-rule-input pb-1" : "grid min-h-9"}>
        {/* Sizing twin; hidden from screen readers. */}
        <span
          aria-hidden="true"
          className={`${type} pointer-events-none invisible [grid-area:1/1] whitespace-pre-wrap break-words`}
        >
          {draft + " "}
        </span>

        <textarea
          id={`note-${props.day}`}
          ref={field}
          rows={1}
          // Matches the column's CHECK constraint.
          maxLength={NOTE_MAX}
          value={draft}
          placeholder={page ? "a line about today…" : "Note…"}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setDraft(saved);
              field.current?.blur();
            }
            // Enter saves (via blur); Shift+Enter is a new line. Not mid-IME.
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              field.current?.blur();
            }
          }}
          // Always exactly tall enough; a scrollbar would only flash.
          className={`${type} [grid-area:1/1] resize-none overflow-hidden bg-transparent text-ink outline-none placeholder:text-ink-muted/70 focus-visible:placeholder:text-ink-muted`}
        />
      </div>

      {/* No aria-live: announcing every keystroke is worse. */}
      {page ? (
        <p className="tabular mt-1 text-right text-caption text-ink-muted">
          {draft.length}/{NOTE_MAX}
        </p>
      ) : draft.length >= COUNTER_FROM && (
        <p className="tabular text-right text-caption leading-none text-ink-muted">
          {left}
        </p>
      )}
    </div>
  );
}
