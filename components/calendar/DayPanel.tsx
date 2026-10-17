"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

import { DayNote } from "./DayNote";
import { MoodRow } from "./MoodRow";
import { StickerMark } from "./StickerMark";
import type { CalendarChange } from "@/lib/changes";
import {
  formatDateNumeric,
  formatDayLong,
  formatWeekdayLong,
  fromDayString,
  type DayString,
} from "@/lib/dates";
import type { DayStickers } from "@/lib/stickers";

type Props = {
  day: DayString;
  stickers: DayStickers;
  onCommit: (change: CalendarChange) => void;
  /** The compact tray, adding to this day. */
  tray: ReactNode;
  /** Wraps the date, so the sheet can make it the dialog title. */
  title?: (date: ReactNode) => ReactNode;
};

const LABEL = "font-sans text-label text-ink-muted";

/** One day: date, mood, its stickers (tap to remove), the bank to add from, and a note. */
export function DayPanel(props: Props) {
  const { day, stickers } = props;
  const date = <time dateTime={day}>{formatDateNumeric(fromDayString(day))}</time>;

  return (
    <div className="flex flex-col gap-7">
      <header>
        <p className="text-label text-ink-muted">{formatWeekdayLong(day).toLowerCase()}</p>
        {props.title ? (
          props.title(date)
        ) : (
          <h2 className="font-display text-heading font-light text-ink">{date}</h2>
        )}
      </header>

      <section aria-label="mood">
        <MoodRow day={day} mood={stickers.mood} onCommit={props.onCommit} />
      </section>

      <section aria-label="on this day">
        {stickers.activities.length === 0 ? (
          <p className="text-label text-ink-muted">nothing yet.</p>
        ) : (
          <ul className="flex flex-wrap gap-x-3 gap-y-3">
            {stickers.activities.map((sticker) => (
              <li key={sticker.activityId} className="w-16">
                <button
                  type="button"
                  onClick={() =>
                    props.onCommit({ kind: "remove", day, activityId: sticker.activityId })
                  }
                  aria-label={`take ${sticker.name} off ${formatDayLong(day)}`}
                  className="group/placed relative flex w-full flex-col items-center gap-1.5"
                >
                  <StickerMark sticker={sticker} size="md" />
                  {/* Shown on hover/focus; touch just taps. */}
                  <span
                    aria-hidden="true"
                    className="absolute -top-1 right-0.5 grid size-5 place-items-center rounded-full bg-paper text-ink-muted ring-1 ring-rule opacity-0 transition-opacity group-hover/placed:opacity-100 group-focus-visible/placed:opacity-100"
                  >
                    <X className="size-3" strokeWidth={1.75} />
                  </span>
                  <span aria-hidden="true" className="w-full truncate text-center text-caption text-ink">
                    {sticker.name}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby={`add-${day}`} className="border-t border-rule pt-5">
        <h3 id={`add-${day}`} className={LABEL}>
          add to this day
        </h3>
        <div className="mt-4">{props.tray}</div>
      </section>

      <section aria-label="note">
        {/* `key`: another day starts a fresh draft. */}
        <DayNote key={day} day={day} note={stickers.note} onCommit={props.onCommit} />
      </section>
    </div>
  );
}
