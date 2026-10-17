"use client";

import { ChevronDown } from "lucide-react";
import { useId, useMemo, useState } from "react";

import { lastLabel } from "./HabitTable";
import { StickerMark } from "@/components/calendar/StickerMark";
import { formatDayLong, type DayString } from "@/lib/dates";
import { frequencyLabel, type HabitRow } from "@/lib/habits";

type Props = {
  rows: HabitRow[];
  /** Archived ids; `HabitRow` doesn't carry it. */
  archived: Set<string>;
  /** Accessible name, range included. */
  caption: string;
  today: DayString;
};

/** Phone Habits tab: one row per habit, most-marked first. Archived fold away. */
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
      <p className="text-label text-ink-muted">
        no habits in your tray yet. add one and it will get a row here.
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
            // 44px touch floor.
            className="flex min-h-11 items-center justify-between border-t border-rule-grid py-3 text-label text-ink-muted outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            {/* The tray's word for it. */}
            <span>archived</span>
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
            // Lines between rows only; archived rows start under the toggle.
            className={`flex items-center gap-3 py-3 ${
              index > 0 || props.ruled ? "border-t border-rule-grid" : ""
            }`}
          >
            {/* Name is printed beside it; don't say it twice. */}
            <span aria-hidden="true" className="flex">
              <StickerMark sticker={row} size="xs" />
            </span>

            {/* Wraps rather than truncates. */}
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-ui text-ink lowercase">{row.name}</span>
              <span className="text-caption text-ink-muted lowercase">{often ?? "—"}</span>
            </span>

            <span className="flex shrink-0 flex-col items-end gap-0.5">
              <span className="tabular text-label text-ink">
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
                  className="text-caption text-ink-muted lowercase"
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
