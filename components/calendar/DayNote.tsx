"use client";

import { Check } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import type { CalendarChange } from "@/lib/changes";
import { formatDayLong, type DayString } from "@/lib/dates";
import { NOTE_MAX } from "@/lib/stickers";

type Props = {
  day: DayString;
  /** What's saved, or null for a day with no note. */
  note: string | null;
  onCommit: (change: CalendarChange) => void;
  /** "page": Today's full-width field with a dashed rule, save and a check. */
  variant?: "page";
};

/** Show the counter only once it's about to matter. */
const COUNT_FROM = 250;

/** Wrap-affecting classes, shared by field and twin so both wrap identically. */
// `wrap-anywhere`: a long unbroken word wraps instead of widening the column.
const NOTE_TYPE = "note w-full wrap-anywhere text-caption leading-4.5";
// Italic only as the placeholder; what you type is upright.
const PAGE_TYPE = "w-full wrap-anywhere font-display text-body-lg font-light";

/**
 * Day note. Saves on blur or Enter, Escape reverts; draft is local, not board state.
 * Height comes from a hidden twin span in the same grid cell (CSS, no jump on
 * first paint). Trailing " " keeps a final newline's line.
 */
export function DayNote(props: Props) {
  const saved = props.note ?? "";

  const [draft, setDraft] = useState(saved);
  const [lastSaved, setLastSaved] = useState(saved);
  // The check: shown after a save here, until the next edit.
  const [done, setDone] = useState(false);
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
    setDone(next !== "");
  }


  const page = props.variant === "page";
  const type = page ? PAGE_TYPE : NOTE_TYPE;

  return (
    // `shrink-0`: the note never absorbs the column's stretch. The rule darkens on focus: the field's focus mark.
    <div className={page ? "" : "mt-s1 shrink-0 border-t border-rule-grid pt-1.5 focus-within:border-ink"}>
      <label className="sr-only" htmlFor={`note-${props.day}`}>
        Notes for {formatDayLong(props.day)}
      </label>

      {/* `min-h`: two-line floor. */}
      <div className={page ? "flex items-end gap-s2" : ""}>
        <div className={page ? "grid min-w-0 flex-1 border-b border-dashed border-rule-input pb-1 focus-within:border-ink" : "grid min-h-9"}>
          {/* Sizing twin; hidden from screen readers. */}
          <span
            aria-hidden="true"
            className={`${type} pointer-events-none invisible [grid-area:1/1] whitespace-pre-wrap`}
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
            onChange={(event) => {
              setDraft(event.target.value);
              setDone(false);
            }}
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
            className={`${type} [grid-area:1/1] resize-none overflow-hidden bg-transparent text-ink outline-none placeholder:text-ink-muted/70 focus-visible:placeholder:text-ink-muted ${page ? "placeholder-shown:italic" : ""}`}
          />
        </div>

        {/* Fixed slot, so the line keeps its length through save and the check. */}
        {page && (
          <div className="flex w-12 shrink-0 justify-end">
            {draft.trim() !== saved ? (
              <Button
                variant="filled"
                size="xs"
                className="mb-1"
                // Keep focus until the click, then save through blur like Enter.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => (document.activeElement === field.current ? field.current?.blur() : commit())}
              >
                save
              </Button>
            ) : (
              done && <Check aria-label="saved" className="mb-2 size-4 shrink-0 text-ink" strokeWidth={2} />
            )}
          </div>
        )}
      </div>

      {/* No aria-live: announcing every keystroke is worse. */}
      {draft.length >= COUNT_FROM && (
        <p className={`tabular text-right text-caption text-ink-muted ${page ? "mt-1" : "leading-none"}`}>
          {draft.length}/{NOTE_MAX}
        </p>
      )}
    </div>
  );
}
