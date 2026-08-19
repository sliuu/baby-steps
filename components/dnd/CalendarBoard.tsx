"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useOptimistic, useState, useTransition } from "react";

import { placeActivity, setDayMood } from "@/app/actions/stickers";
import { MonthGrid } from "@/components/calendar/MonthGrid";
import { MoodMark } from "@/components/calendar/MoodMark";
import { StickerMark } from "@/components/calendar/StickerMark";
import { StickerTray } from "@/components/tray/StickerTray";
import { TrayRowFace } from "@/components/tray/TrayGroup";
import { formatDayLong, toMonthString, type DayString } from "@/lib/dates";
import { TRAY_INSET } from "@/lib/layout";
import { MOOD_LABEL } from "@/lib/moods";
import type { LibraryGroup } from "@/lib/queries/activities";
import type { StickersByDay } from "@/lib/queries/stickers";
import { payloadName, readDragPayload, type DragPayload } from "./payload";

type Props = {
  groups: LibraryGroup[];
  stickersByDay: StickersByDay;
};

/** A sticker landing on a day: everything the optimistic redraw needs. */
type Drop = { day: DayString; payload: DragPayload };

/**
 * The optimistic redraw, and the only place that duplicates what the server
 * will do. Same rules as the two actions in `app/actions/stickers.ts`: a mood
 * replaces, an activity that's already there changes nothing.
 *
 * A new Map and new objects along the path that changed, never a mutation of
 * what came in. React compares by identity to decide what to re-render, so
 * pushing onto the existing array would draw nothing at all — and it would also
 * corrupt the server's copy, which we still need to fall back to.
 */
function withDrop(byDay: StickersByDay, drop: Drop): StickersByDay {
  const current = byDay.get(drop.day) ?? { activities: [], mood: null };
  const next = new Map(byDay);

  if (drop.payload.kind === "mood") {
    next.set(drop.day, { ...current, mood: drop.payload.mood });
    return next;
  }

  const { activityId, face } = drop.payload;
  if (current.activities.some((sticker) => sticker.activityId === activityId)) {
    return byDay;
  }

  next.set(drop.day, {
    ...current,
    activities: [
      ...current.activities,
      // There is no day_activities row yet, so there is no real id to use. This
      // one only has to be unique among its siblings for React's key, and it
      // only has to survive until the server's answer replaces the whole Map.
      { id: `pending:${drop.day}:${activityId}`, activityId, ...face },
    ],
  });
  return next;
}

/**
 * Pointer first, centres as the fallback.
 *
 * `closestCenter` compares the centre of the *dragged* thing to the centre of
 * each day. That's wrong for a pointer here: the overlay is a whole tray row,
 * so its centre can sit a hundred pixels from your cursor and the wrong square
 * lights up. `pointerWithin` asks the only question a mouse user is asking —
 * which cell is under the tip? — and it's exact.
 *
 * But a keyboard drag has no pointer at all, and `pointerWithin` returns
 * nothing forever. So it falls through to `closestCenter`, which needs no
 * cursor. One line, and both input methods get the rule that suits them.
 */
const collisionDetection: CollisionDetection = (args) => {
  const underPointer = pointerWithin(args);
  return underPointer.length > 0 ? underPointer : closestCenter(args);
};

/**
 * The drag arena, and the reason this component exists at all.
 *
 * `DndContext` has to be an ancestor of both the thing you pick up and the
 * thing you drop it on — the tray and the grid. Those were siblings inside a
 * Server Component until now, with nothing above them but layout, so the layout
 * is what had to move. Which means the two-column arrangement, the tray, and
 * the grid are all in the browser bundle now; `CalendarView` kept the part that
 * matters, which is the fetching.
 *
 * It also owns the optimistic copy of the calendar. `useOptimistic` takes the
 * server's Map and a reducer, and hands back a Map that includes drops still in
 * flight. When the transition ends it stops overriding and the value falls back
 * to the prop — which by then is either the server's new answer, or, if the
 * write failed, exactly what it was before. The rollback isn't code we write;
 * it's what happens when the lie expires.
 */
export function CalendarBoard(props: Props) {
  const [stickersByDay, applyDrop] = useOptimistic(props.stickersByDay, withDrop);
  const [dragging, setDragging] = useState<DragPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const sensors = useSensors(
    // Four pixels of travel before a press counts as a drag. Without it every
    // click on a sticker starts one, and Step 9 wants that click.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  );

  function handleDragStart(event: DragStartEvent) {
    setDragging(readDragPayload(event.active.data.current));
  }

  function handleDragEnd(event: DragEndEvent) {
    setDragging(null);

    const payload = readDragPayload(event.active.data.current);
    // Released over nothing. `over` is null, and that is the whole check.
    if (!payload || typeof event.over?.id !== "string") return;
    const day = event.over.id;

    // Everything below happens inside one transition, and the order matters.
    // `applyDrop` is only allowed to be called from inside one — that's how
    // React knows when the optimistic value has expired. The await keeps the
    // transition open for the round trip, and Next.js commits the re-rendered
    // page inside it too, so the sticker is drawn continuously: optimistic
    // first, real second, no frame in between where it's missing.
    startTransition(async () => {
      applyDrop({ day, payload });

      const result =
        payload.kind === "mood"
          ? await setDayMood(day, payload.mood)
          : await placeActivity(day, payload.activityId);

      setError(result.ok ? null : result.message);
    });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      accessibility={{ announcements }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setDragging(null)}
    >
      <div className="flex flex-col gap-10 lg:flex-row lg:items-start">
        {/* min-w-0 is doing real work: a flex child defaults to refusing to
            shrink below its content's width, so without it a wide grid would
            push the rail off the side instead of narrowing. */}
        <div className="min-w-0 flex-1">
          {/* The server's month, so first paint isn't blank. MonthGrid corrects
              it on mount if the visitor's timezone disagrees. */}
          <MonthGrid
            initialMonth={toMonthString(new Date())}
            stickersByDay={stickersByDay}
          />
        </div>

        {/* Beside the calendar once there's room, stacked underneath when there
            isn't. Sticky below the 4rem nav so it stays put while a tall month
            scrolls — which is what makes it usable as a drag source — and
            scrolling on its own once the list outgrows the window, rather than
            pushing the page taller than the calendar it sits beside.

            That scroll is vertical only, and keeping it that way is a rule, not
            a preference: nothing in here may be wider than the rail. Note that
            `overflow-y-auto` does not leave the other axis alone — CSS promotes
            `overflow-x` from `visible` to `auto` alongside it — so a single
            child bleeding past the edge is a horizontal scrollbar, and hiding
            it would only move the problem. Long names truncate; hit areas fill
            the width rather than reaching past it. */}
        <aside className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)] lg:w-72 lg:shrink-0 lg:overflow-y-auto">
          <StickerTray groups={props.groups} />

          {/* Rendered always, filled sometimes. A live region the browser only
              discovers at the moment it gains text is a live region that often
              doesn't announce — it has to be in the tree beforehand for the
              change to be a change. */}
          <div role="status" aria-live="polite" className="mt-6 empty:hidden">
            {/* Edge to edge like a row's highlight, with its text on the same
                inset as the sticker names above it. Filled things span the
                rail; words start at TRAY_INSET. */}
            {error && (
              <p
                className={`${TRAY_INSET} rounded-md bg-ramp-red-soft py-2 text-[0.9rem]`}
              >
                {error}
              </p>
            )}
          </div>
        </aside>
      </div>

      {/* The floating copy. It exists so the original can stay exactly where it
          is: nothing is removed from the tray mid-drag, so nothing below it
          jumps up to fill the gap while your hand is still moving.

          It also escapes `overflow: hidden` and every transform on the way up,
          because it renders at the top of the arena rather than inside the
          rail. A sticker dragged out of a scrolling container would otherwise
          be clipped at its edge. */}
      <DragOverlay dropAnimation={null}>
        {dragging && (
          <div
            // Same inset and same vertical padding as the row it was lifted
            // from, so the copy under the cursor is the size of the original.
            className={`${TRAY_INSET} flex w-fit items-center gap-2.5 rounded-md border border-hairline bg-surface py-1 shadow-lg`}
          >
            {dragging.kind === "mood" ? (
              <TrayRowFace
                visual={<MoodMark mood={dragging.mood} />}
                name={MOOD_LABEL[dragging.mood]}
              />
            ) : (
              <TrayRowFace
                visual={<StickerMark sticker={dragging.face} />}
                name={dragging.face.name}
              />
            )}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

/**
 * What a screen reader says during a drag.
 *
 * dnd-kit announces by default, but it only knows ids — and ours are uuids and
 * date strings, so the default reads out "draggable item
 * 8f3c…-…-…". These say the sticker's name and the day in words.
 */
const announcements: Announcements = {
  onDragStart: ({ active }) => describe(active.data.current, "Picked up"),
  onDragOver: ({ active, over }) => {
    const name = nameOf(active.data.current);
    if (!name) return;
    return over
      ? `${name} is over ${formatDayLong(String(over.id))}.`
      : `${name} is not over a day.`;
  },
  onDragEnd: ({ active, over }) => {
    const name = nameOf(active.data.current);
    if (!name) return;
    return over
      ? `${name} dropped on ${formatDayLong(String(over.id))}.`
      : `${name} returned to the tray.`;
  },
  onDragCancel: ({ active }) => describe(active.data.current, "Cancelled;"),
};

function nameOf(data: unknown): string | undefined {
  const payload = readDragPayload(data);
  return payload ? payloadName(payload) : undefined;
}

function describe(data: unknown, verb: string): string | undefined {
  const name = nameOf(data);
  return name && `${verb} ${name}.`;
}
