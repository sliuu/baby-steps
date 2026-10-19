"use client";

import { useDroppable } from "@dnd-kit/core";
import { ChevronDown, Plus, X } from "lucide-react";
import { useMemo } from "react";

import { Flower } from "@/components/balance/Flower";
import { useSettings } from "@/components/SettingsProvider";
import { DayNote } from "./DayNote";
import { MoodRow } from "./MoodRow";
import { StickerMark } from "./StickerMark";
import type { PeriodProps } from "./period";
import { balanceLevels } from "@/lib/balance";
import { formatDateShort, fromDayString, type DayString } from "@/lib/dates";
import type { LibraryGroup } from "@/lib/queries/activities";
import { NO_STICKERS } from "@/lib/stickers";
import { cn } from "@/lib/utils";

type Props = PeriodProps & {
  /** The day on show: today. */
  day: DayString;
  /** For the flower: categories and which category each sticker is in. */
  groups: LibraryGroup[];
  /** Desktop: scrolls to the tray. */
  onAddSticker: () => void;
  /** Phones: opens the add-stickers sheet. */
  onPickStickers: () => void;
  className?: string;
};

/** Today: the question, stickers, mood and a note; the flower beside (lg) or below. */
export function TodayView(props: Props) {
  const { weekStartsOn, petals } = useSettings();
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
    return balanceLevels({ categories, days, today: fromDayString(day), weekStartsOn, rule: petals });
  }, [props.groups, props.stickersByDay, categories, day, weekStartsOn, petals]);

  const faded = (matched: boolean) => (highlight && !matched ? "opacity-35" : "");
  const empty = stickers.activities.length === 0;

  return (
    <section
      className={cn(
        "grid gap-s6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-x-s7",
        props.className,
      )}
    >
      <div className="flex min-w-0 flex-col justify-between gap-s5">
        <div className="flex flex-1 flex-col gap-s4">
          <header>
            {/* Until the header has room for it (56rem, as in TopNav). */}
            <time dateTime={day} className="font-display text-body-lg font-normal text-accent-ink min-[56rem]:hidden">
              {formatDateShort(fromDayString(day))}
            </time>
            <h1 className="font-display text-heading font-light text-ink sm:text-title">
              what have you been up to?
            </h1>
          </header>

          <section ref={setNodeRef} aria-labelledby="today-stickers" className="relative flex-1">
            {props.target?.day === day && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-2 rounded-lg border-2 border-dashed border-rule"
              />
            )}

            <h2 id="today-stickers" className="sr-only">
              today&rsquo;s stickers
            </h2>

            <ul className="flex min-h-28 flex-wrap gap-x-s4">
              {empty && (
                <li className="hidden h-28 items-start lg:flex">
                  <button
                    type="button"
                    onClick={props.onAddSticker}
                    className="inline-flex items-center gap-1 text-label text-ink-muted underline-offset-4 hover:text-ink hover:underline"
                  >
                    add stickers
                    <ChevronDown className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
                  </button>
                </li>
              )}
              {stickers.activities.map((sticker) => (
                <li
                  key={sticker.activityId}
                  className={cn(
                    "group/sticker relative flex h-28 w-20 flex-col items-center justify-end gap-1.5 pb-1.5",
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
                    className="absolute top-3 right-1 grid size-6 place-items-center rounded-full bg-paper text-ink-muted ring-1 ring-rule transition-opacity hover:text-ink focus-visible:opacity-100 group-hover/sticker:opacity-100 pointer-fine:opacity-0"
                  >
                    <X className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
                  </button>
                </li>
              ))}
              {/* Phones add here; no dragging. */}
              <li className="flex h-28 w-20 flex-col items-center justify-end gap-1.5 pb-1.5 lg:hidden">
                <button
                  type="button"
                  onClick={props.onPickStickers}
                  aria-label="add stickers"
                  className="grid size-sticker-lg place-items-center rounded-full border border-dashed border-rule-input text-ink-muted transition-colors hover:border-ink hover:text-ink"
                >
                  <Plus className="size-5" strokeWidth={1.5} aria-hidden="true" />
                </button>
                <span aria-hidden="true" className="text-label text-ink-muted">
                  add
                </span>
              </li>
            </ul>
          </section>
        </div>

        {/* Mood, then the day's note under it. */}
        <div className="flex flex-col gap-s4">
          <section aria-labelledby="today-mood">
            <h2 id="today-mood" className="sr-only">
              mood
            </h2>
            <div className="w-full max-w-xs">
              <MoodRow
                day={day}
                mood={stickers.mood}
                onCommit={props.onCommit}
                highlight={highlight}
                labels={false}
                stickerBorder
                greyOthers
              />
            </div>
          </section>

          <div className="w-full max-w-md pt-s3 pl-s1">
            <DayNote key={day} day={day} note={stickers.note} onCommit={props.onCommit} variant="page" />
          </div>
        </div>
      </div>

      <figure className="flex flex-col items-center gap-s1">
        <Flower categories={categories} levels={levels} className="w-full max-w-80" />
        <figcaption className="text-caption text-ink-muted">the last few weeks</figcaption>
      </figure>
    </section>
  );
}
