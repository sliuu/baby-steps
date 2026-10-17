"use client";

import { useDroppable } from "@dnd-kit/core";
import { Plus, X } from "lucide-react";
import { useMemo } from "react";

import { Flower } from "@/components/balance/Flower";
import { DayNote } from "./DayNote";
import { MoodRow } from "./MoodRow";
import { StickerMark } from "./StickerMark";
import type { PeriodProps } from "./period";
import { balanceLevels } from "@/lib/balance";
import {
  formatDateNumeric,
  formatWeekdayLong,
  fromDayString,
  type DayString,
} from "@/lib/dates";
import type { LibraryGroup } from "@/lib/queries/activities";
import { NO_STICKERS } from "@/lib/stickers";
import { cn } from "@/lib/utils";

type Props = PeriodProps & {
  /** The day on show: today. */
  day: DayString;
  /** For the flower: categories and which category each sticker is in. */
  groups: LibraryGroup[];
  /** Scrolls to the tray. */
  onAddSticker: () => void;
  className?: string;
};

/** Today: date, mood, stickers, note; the flower beside (lg) or below. */
export function TodayView(props: Props) {
  const { day, highlight } = props;
  const stickers = props.stickersByDay.get(day) ?? NO_STICKERS;
  const { setNodeRef } = useDroppable({ id: day });

  const categories = useMemo(
    () =>
      props.groups.map((group) => ({
        id: group.categoryId,
        name: group.categoryName.toLowerCase(),
        colorKey: group.colorKey,
      })),
    [props.groups],
  );

  // Client-side from the loaded history, so it follows optimistic changes.
  const levels = useMemo(() => {
    const categoryOf = new Map<string, string>();
    for (const group of props.groups) {
      for (const sticker of group.stickers) categoryOf.set(sticker.id, group.categoryId);
    }
    const days = [...props.stickersByDay].map(([d, placed]) => ({
      day: d,
      categoryIds: placed.activities.flatMap((a) => categoryOf.get(a.activityId) ?? []),
    }));
    return balanceLevels({ categories, days, today: fromDayString(day) });
  }, [props.groups, props.stickersByDay, categories, day]);

  const faded = (matched: boolean) => (highlight && !matched ? "opacity-35" : "");
  const empty = stickers.activities.length === 0;

  const addButton = (
    <button
      type="button"
      onClick={props.onAddSticker}
      aria-label="add a sticker"
      className="grid size-sticker-lg shrink-0 place-items-center rounded-full border border-dashed border-rule-input text-ink-muted transition-colors hover:border-ink hover:text-ink"
    >
      <Plus className="size-5" strokeWidth={1.5} aria-hidden="true" />
    </button>
  );

  return (
    <section
      className={cn(
        "grid gap-11 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-x-16",
        props.className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-7.5">
        <header>
          <p className="text-label text-ink-muted">{formatWeekdayLong(day).toLowerCase()}</p>
          <h1 className="font-display text-display font-light text-ink">
            <time dateTime={day}>{formatDateNumeric(fromDayString(day))}</time>
          </h1>
        </header>

        <section aria-labelledby="today-mood">
          <h2 id="today-mood" className="font-sans text-label text-ink-muted">
            how are you feeling?
          </h2>
          <div className="mt-3.5 max-w-md">
            <MoodRow day={day} mood={stickers.mood} onCommit={props.onCommit} highlight={highlight} />
          </div>
        </section>

        <section ref={setNodeRef} aria-labelledby="today-stickers" className="relative">
          {props.target?.day === day && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-2 border-2 border-ink/40 bg-ink/6"
            />
          )}

          <h2 id="today-stickers" className="font-sans text-label text-ink-muted">
            today
          </h2>

          {empty ? (
            <div className="mt-3.5 flex items-center gap-3.5">
              {addButton}
              <p className="text-label text-ink-muted">nothing yet. tap a sticker to add it.</p>
            </div>
          ) : (
            <ul className="mt-3.5 flex flex-wrap gap-x-5.5 gap-y-3.5">
              {stickers.activities.map((sticker) => (
                <li
                  key={sticker.activityId}
                  className={cn(
                    "group/sticker relative flex w-20 flex-col items-center gap-2",
                    props.landed?.day === day &&
                      props.landed.activityId === sticker.activityId &&
                      "animate-land",
                    faded(highlight?.activityIds.has(sticker.activityId) ?? false),
                  )}
                >
                  <StickerMark sticker={sticker} size="lg" />
                  <span aria-hidden="true" className="w-full truncate text-center text-label text-ink">
                    {sticker.name}
                  </span>
                  {/* Always shown on touch; hover/focus on desktop. */}
                  <button
                    type="button"
                    onClick={() =>
                      props.onCommit({ kind: "remove", day, activityId: sticker.activityId })
                    }
                    aria-label={`take ${sticker.name} off today`}
                    className="absolute -top-1 right-1 grid size-6 place-items-center rounded-full bg-paper text-ink-muted ring-1 ring-rule transition-opacity hover:text-ink focus-visible:opacity-100 group-hover/sticker:opacity-100 pointer-fine:opacity-0"
                  >
                    <X className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
                  </button>
                </li>
              ))}
              <li className="flex w-20 justify-center">{addButton}</li>
            </ul>
          )}
        </section>

        {/* `key`: a new day resets the draft. */}
        <DayNote key={day} day={day} note={stickers.note} onCommit={props.onCommit} variant="page" />
      </div>

      <figure className="flex flex-col items-center gap-2 lg:pt-6">
        <Flower categories={categories} levels={levels} className="w-full max-w-80" />
        <figcaption className="text-caption text-ink-muted">last three weeks</figcaption>
      </figure>
    </section>
  );
}
