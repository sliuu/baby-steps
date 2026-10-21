"use client";

import { Plus, X } from "lucide-react";
import { useLayoutEffect, useMemo, useRef } from "react";

import { Flower } from "@/components/balance/Flower";
import { useSettings } from "@/components/SettingsProvider";
import { DayNote } from "./DayNote";
import { MoodRow } from "./MoodRow";
import { StickerMark } from "./StickerMark";
import type { PeriodProps } from "./period";
import { balanceLevels } from "@/lib/balance";
import { formatDateShort, fromDayString, type DayString } from "@/lib/dates";
import type { LibraryGroup } from "@/lib/queries/activities";
import { TITLE } from "@/lib/layout";
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

  // Fly-in: a tapped tray sticker travels from its tile. Waits for the optimistic render.
  const list = useRef<HTMLUListElement>(null);
  const flown = useRef<typeof props.landed>(null);
  useLayoutEffect(() => {
    const landed = props.landed;
    if (!landed?.from || landed.day !== day || flown.current === landed) return;
    const mark = list.current?.querySelector(`[data-sticker="${landed.activityId}"]`)?.firstElementChild;
    if (!mark) return;
    flown.current = landed;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const to = mark.getBoundingClientRect();
    const { from } = landed;
    mark.animate(
      [
        {
          transformOrigin: "top left",
          transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width})`,
        },
        { transformOrigin: "top left", transform: "none" },
      ],
      { duration: 420, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)", fill: "backwards" },
    );
    // The name follows once the mark is nearly there.
    mark.nextElementSibling?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, delay: 260, fill: "backwards" });
  }, [props.landed, day, stickers]);

  // Removal: the sticker shrinks away, then the rest slide into its place.
  const leaving = useRef<Animation | null>(null);
  const before = useRef<Map<string, DOMRect> | null>(null);
  function remove(activityId: string, item: HTMLElement) {
    const commit = () => props.onCommit({ kind: "remove", day, activityId });
    if (leaving.current || matchMedia("(prefers-reduced-motion: reduce)").matches) return commit();
    leaving.current = item.animate([{ transform: "none", opacity: 1 }, { transform: "scale(0.3)", opacity: 0 }], {
      duration: 200,
      easing: "cubic-bezier(0.4, 0, 1, 1)",
      fill: "forwards",
    });
    leaving.current.finished.then(() => {
      const items = list.current?.querySelectorAll<HTMLElement>("[data-flip]") ?? [];
      before.current = new Map([...items].map((el) => [el.dataset.flip!, el.getBoundingClientRect()]));
      commit();
    });
  }
  useLayoutEffect(() => {
    // Gone, or back after a failed save: either way, drop the shrink.
    leaving.current?.cancel();
    leaving.current = null;
    const was = before.current;
    before.current = null;
    if (!was) return;
    for (const el of list.current?.querySelectorAll<HTMLElement>("[data-flip]") ?? []) {
      const from = was.get(el.dataset.flip!);
      if (!from) continue;
      const to = el.getBoundingClientRect();
      if (from.left === to.left && from.top === to.top) continue;
      el.animate([{ transform: `translate(${from.left - to.left}px, ${from.top - to.top}px)` }, { transform: "none" }], {
        duration: 260,
        easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
      });
    }
  }, [stickers]);

  const faded = (matched: boolean) => (highlight && !matched ? "opacity-35" : "");

  return (
    <section
      className={cn(
        "grid gap-s6 lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-x-s7",
        props.className,
      )}
    >
      {/* Rhythm: s6 between sections, s4 inside one. */}
      <div className="flex min-w-0 flex-col justify-between gap-s6">
        <div className="flex flex-1 flex-col gap-s4">
          <header>
            {/* Until the header has room for it (56rem, as in TopNav). */}
            <time dateTime={day} className="font-display text-body-lg font-normal text-ink min-[56rem]:hidden">
              {formatDateShort(fromDayString(day))}
            </time>
            {/* Italic, like the landing: the app asking you something. */}
            <h1 className={TITLE}>
              what have you been up to?
            </h1>
          </header>

          {/* No dropping here: Today adds by tap, with a fly-in. */}
          <section aria-labelledby="today-stickers" className="flex-1">
            <h2 id="today-stickers" className="sr-only">
              today&rsquo;s stickers
            </h2>

            {/* `-ml-2`: the first mark's edge lines up with the column, not its 80px slot. */}
            <ul ref={list} className="-ml-2 flex min-h-28 flex-wrap gap-x-s4">
              {stickers.activities.map((sticker) => (
                <li
                  key={sticker.activityId}
                  data-sticker={sticker.activityId}
                  data-flip={sticker.activityId}
                  className={cn(
                    "group/sticker relative flex h-28 w-20 flex-col items-center justify-end gap-1.5 pb-1.5",
                    // A fly-in replaces the land.
                    props.landed?.day === day &&
                      props.landed.activityId === sticker.activityId &&
                      !props.landed.from &&
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
                    onClick={(event) => remove(sticker.activityId, event.currentTarget.parentElement!)}
                    aria-label={`take ${sticker.name} off today`}
                    className="absolute top-3 right-1 grid size-6 place-items-center rounded-full bg-paper text-ink-muted ring-1 ring-rule transition-opacity hover:text-ink focus-visible:opacity-100 group-hover/sticker:opacity-100 pointer-fine:opacity-0"
                  >
                    <X className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
                  </button>
                </li>
              ))}
              {/* Phones open the sheet; desktop scrolls to the tray. */}
              <li data-flip="add" data-tour="add" className="flex h-28 w-20 flex-col items-center justify-end gap-1.5 pb-1.5">
                <button
                  type="button"
                  onClick={() =>
                    matchMedia("(min-width: 64rem)").matches ? props.onAddSticker() : props.onPickStickers()
                  }
                  aria-label="add stickers"
                  className="grid size-sticker-lg place-items-center rounded-full bg-ink text-paper transition-colors hover:bg-ink/85"
                >
                  <Plus className="size-5" strokeWidth={1.5} aria-hidden="true" />
                </button>
                <span aria-hidden="true" className="text-label text-ink">
                  add
                </span>
              </li>
            </ul>
          </section>
        </div>

        {/* The note, then mood last: both optional. */}
        <div className="flex flex-col gap-s6">
          <DayNote key={day} day={day} note={stickers.note} onCommit={props.onCommit} variant="page" />

          {/* Quiet on purpose: optional, not the point of the page. */}
          <section aria-labelledby="today-mood" className="flex flex-wrap items-center gap-x-s3 gap-y-s1">
            <h2 id="today-mood" className="font-display text-body-lg font-light italic text-ink-muted">
              how are you feeling?
            </h2>
            <MoodRow
              day={day}
              mood={stickers.mood}
              onCommit={props.onCommit}
              highlight={highlight}
              labels={false}
              size="sm"
              greyOthers
            />
          </section>
        </div>
      </div>

      {/* The tour scrolls it just above the phone nav, not to the footer. */}
      <figure
        data-tour="flower"
        className="flex scroll-mb-[calc(var(--bottom-nav-h)+var(--spacing-s3))] flex-col items-center gap-s1 sm:scroll-mb-s3"
      >
        <Flower categories={categories} levels={levels} className="w-full max-w-64" />
        <figcaption className="text-caption text-ink-muted">the last few weeks</figcaption>
      </figure>
    </section>
  );
}
