"use client";

import { ChevronDown } from "lucide-react";
import { useId, useMemo, useState } from "react";

import { lastLabel } from "./HabitTable";
import { StickerMark } from "@/components/calendar/StickerMark";
import { formatDayLong, type DayString } from "@/lib/dates";
import { frequencyLabel, type HabitRow } from "@/lib/habits";

type Props = {
  /** The same rows the wide screen's table draws, counted once on the page. */
  rows: HabitRow[];
  /** Which of them are archived — `HabitRow` doesn't carry it. */
  archived: Set<string>;
  /** The list's accessible name, range included. See `captionFor`. */
  caption: string;
  today: DayString;
};

/**
 * Every habit as a row, most-marked first: the phone's whole Habits tab.
 *
 * It is the table on a wide screen with the columns taken away. Six columns
 * don't fit 335px, and a table that scrolls sideways hides the rate — the one
 * thing on the tab you can't work out by counting stickers on the calendar.
 * So each row keeps the four things that matter at a glance: the sticker, its
 * name, how often it happens, and how many times and how lately it did.
 *
 * **No sorting, no filter, no pages.** The wide table has all three because it
 * is the panel you look things up in. This is the one you read top to bottom,
 * and a fixed order — count, then name — means a habit is always in the same
 * place for the same range.
 *
 * Archived habits fold away under their own row, and only the ones with marks
 * in the range: an archived habit you didn't do is not a fact about this
 * period. They are still counted in `Areas`, which is why they are here at all.
 */
export function HabitList(props: Props) {
  const [open, setOpen] = useState(false);
  const panel = useId();

  const [live, archived] = useMemo(() => {
    const ordered = [...props.rows].sort(
      (a, b) => b.count - a.count || a.name.localeCompare(b.name),
    );
    return [
      ordered.filter((row) => !props.archived.has(row.activityId)),
      ordered.filter((row) => props.archived.has(row.activityId)),
    ];
  }, [props.rows, props.archived]);

  if (props.rows.length === 0) {
    return (
      <p className="text-[0.875rem] text-ink-muted">
        No habits in your tray yet. Add one from the Calendar and it will get a
        row here.
      </p>
    );
  }

  return (
    <section aria-label={props.caption} className="flex flex-col">
      <Rows rows={live} today={props.today} />

      {archived.length > 0 && (
        <>
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panel}
            onClick={() => setOpen((was) => !was)}
            // 44px tall by padding, the touch floor, and ruled off from the
            // last live row the way the rows are ruled off from each other.
            className="flex min-h-11 items-center justify-between border-t border-hairline py-3 text-[0.8rem] text-ink-label outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            {/* "Archived", never "Inactive" or "Paused": that is the word the
                tray uses for the same thing. */}
            <span>Archived</span>
            <span className="flex items-center gap-1.5 text-ink-muted">
              <span className="tabular">{archived.length}</span>
              <ChevronDown
                aria-hidden="true"
                className={`size-3.5 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
              />
            </span>
          </button>

          <div id={panel} hidden={!open}>
            <Rows rows={archived} today={props.today} ruled />
          </div>
        </>
      )}
    </section>
  );
}

function Rows(props: { rows: HabitRow[]; today: DayString; ruled?: boolean }) {
  return (
    <ul>
      {props.rows.map((row, index) => {
        const often = frequencyLabel(row);

        return (
          <li
            key={row.activityId}
            // A hairline between rows and none above the first — the section
            // starts at the range row's edge, and a line there would be a
            // rule under a control. The archived list is ruled from its first
            // row, because the toggle above it is a row too.
            className={`flex items-center gap-[11px] py-[13px] ${
              index > 0 || props.ruled ? "border-t border-hairline" : ""
            }`}
          >
            {/* The name is printed beside it, so the sticker's own sr-only
                name would be said twice. */}
            <span aria-hidden="true" className="flex">
              <StickerMark sticker={row} className="size-[30px]" />
            </span>

            {/* Shrinks and wraps: "Shopping / Clothes" at 320px is two lines
                rather than an ellipsis. */}
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[0.9rem]">{row.name}</span>
              {/* `note`, and the name above it deliberately not. The name is
                  what the thing is called; "about every 11 days" is a reading
                  of the count two columns over, offered rather than measured.
                  The dash keeps the italic too — it stands in for the same
                  sentence. */}
              <span className="note text-[0.8rem] text-ink-muted">
                {often ?? "—"}
              </span>
            </span>

            <span className="flex shrink-0 flex-col items-end gap-0.5">
              <span className="tabular text-[0.8rem]">
                {row.count === 0 ? (
                  <>
                    <span className="text-ink-muted">—</span>
                    <span className="sr-only"> no marks</span>
                  </>
                ) : (
                  <>
                    {row.count}
                    <span className="sr-only">
                      {row.count === 1 ? " mark" : " marks"}
                    </span>
                  </>
                )}
              </span>
              {row.last && (
                <span
                  title={formatDayLong(row.last)}
                  className="text-[0.7rem] text-ink-muted"
                >
                  <span className="sr-only">last </span>
                  {lastLabel(row.last, props.today)}
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
