"use client";

import { useDroppable } from "@dnd-kit/core";
import { X } from "lucide-react";
import { useMemo } from "react";

import { Flower } from "@/components/balance/Flower";
import { MoodRow } from "./MoodRow";
import { StickerMark } from "./StickerMark";
import type { PeriodProps } from "./period";
import { balanceLevels } from "@/lib/balance";
import { formatDateNumeric, fromDayString, type DayString } from "@/lib/dates";
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

/** Today: the question, mood, stickers on ruled lines; the flower beside (lg) or below. */
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

  return (
    <section
      className={cn(
        "grid gap-11 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-x-16",
        props.className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-7.5">
        <header>
          {/* Phones only; the header shows it from sm. */}
          <time dateTime={day} className="font-display text-body-lg font-light text-accent-ink sm:hidden">
            {formatDateNumeric(fromDayString(day))}
          </time>
          <h1 className="font-display text-heading font-light text-ink sm:text-display-sm">
            what have you been up to?
          </h1>
        </header>

        <section aria-labelledby="today-mood" className="flex items-center gap-6">
          <h2 id="today-mood" className="font-display text-body-lg text-ink">
            mood
          </h2>
          <div className="w-full max-w-xs">
            <MoodRow day={day} mood={stickers.mood} onCommit={props.onCommit} highlight={highlight} labels={false} />
          </div>
        </section>

        <section ref={setNodeRef} aria-labelledby="today-stickers" className="relative">
          {props.target?.day === day && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-2 border-2 border-ink/40 bg-ink/6"
            />
          )}

          <h2 id="today-stickers" className="sr-only">
            today&rsquo;s stickers
          </h2>

          {/* One line per row; stickers stand on them. */}
          <ul className="ruled flex min-h-28 flex-wrap gap-x-5.5">
            {empty && (
              <li className="flex h-28 items-end pb-3">
                <button
                  type="button"
                  onClick={props.onAddSticker}
                  className="text-label text-ink-muted underline-offset-4 hover:text-ink hover:underline"
                >
                  add stickers below
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
          </ul>
        </section>
      </div>

      <figure className="flex flex-col items-center gap-2 lg:pt-6">
        <Flower categories={categories} levels={levels} className="w-full max-w-80" />
        <figcaption className="text-caption text-ink-muted">the last few weeks</figcaption>
      </figure>
    </section>
  );
}
