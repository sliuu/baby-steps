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
import { useEffect, useMemo, useOptimistic, useState, useTransition } from "react";

import {
  clearDayMood,
  placeActivity,
  removeActivity,
  setDayMood,
  type PlaceResult,
} from "@/app/actions/stickers";
import { DayModal } from "@/components/calendar/DayModal";
import { MonthGrid } from "@/components/calendar/MonthGrid";
import { MoodMark } from "@/components/calendar/MoodMark";
import { StickerMark } from "@/components/calendar/StickerMark";
import { StickerTray } from "@/components/tray/StickerTray";
import { TrayRowFace } from "@/components/tray/TrayGroup";
import { applyChange, type CalendarChange } from "@/lib/changes";
import { formatDayLong, toMonthString, type DayString } from "@/lib/dates";
import { buildHighlight, type Selection } from "@/lib/highlight";
import { TRAY_INSET } from "@/lib/layout";
import { MOOD_LABEL } from "@/lib/moods";
import type { LibraryGroup } from "@/lib/queries/activities";
import { NO_STICKERS, type StickersByDay } from "@/lib/stickers";
import { payloadName, readDragPayload, type DragPayload } from "./payload";

type Props = {
  groups: LibraryGroup[];
  stickersByDay: StickersByDay;
};

/** Which action a change is. The only place the two are matched up. */
function runChange(change: CalendarChange): Promise<PlaceResult> {
  switch (change.kind) {
    case "place":
      return placeActivity(change.day, change.activityId);
    case "remove":
      return removeActivity(change.day, change.activityId);
    case "mood":
      return setDayMood(change.day, change.mood);
    case "clearMood":
      return clearDayMood(change.day);
  }
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
  const [stickersByDay, apply] = useOptimistic(
    props.stickersByDay,
    applyChange,
  );
  const [dragging, setDragging] = useState<DragPayload | null>(null);
  const [openDay, setOpenDay] = useState<DayString | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  /**
   * Highlight mode, and the whole of it is this one line.
   *
   * It sits here for the plainest reason there is: the tray sets it, the grid
   * draws it, and those two are siblings. The lowest component containing both
   * is this one — which already exists because `DndContext` needed exactly the
   * same thing, so lifting state up cost nothing this time.
   *
   * What's worth noticing is where it *isn't*. There's no column for it, no
   * server action, no `refresh()`, nothing in the URL and nothing in
   * `localStorage`. A highlight is a way of looking at the month rather than a
   * fact about it, so it lives for as long as the component does and dies on
   * reload. It doesn't even survive switching to the Trends tab, because
   * `AppShell` unmounts this whole tree to do that — and coming back to a month
   * still filtered by something you clicked five minutes ago would be a small
   * mystery, not a feature.
   *
   * Contrast the sticker sitting next to it on a day: that's a fact, it went
   * through a Server Action, and it's still there next year. Same click, same
   * tray, opposite lifetimes — which is the distinction this step is about.
   */
  const [selection, setSelection] = useState<Selection | null>(null);

  /**
   * Everything visible about the selection, derived rather than stored.
   *
   * `selection` is three fields of identity; this is the colour, the label, and
   * the set of activity ids that count. Keeping the second computed means a
   * sticker renamed or recoloured on the server changes what the highlight says
   * with no code, and it's why nothing has to reset the selection when the
   * library reloads under it. Null when the selected thing is gone.
   */
  const highlight = useMemo(
    () => (selection ? buildHighlight(selection, props.groups) : null),
    [selection, props.groups],
  );

  /**
   * Escape clears it, which is the third way out after clicking the lit row
   * again and the "clear" link in the tray header.
   *
   * Bound only while something is lit *and* the modal is shut. Escape is
   * heavily subscribed here — Radix closes the dialog with it, dnd-kit cancels
   * a drag with it — and a listener that isn't attached can't race with either.
   */
  useEffect(() => {
    if (!selection || openDay) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setSelection(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selection, openDay]);

  const sensors = useSensors(
    // Four pixels of travel before a press counts as a drag. Without it every
    // click on a sticker starts one, and both the day cell and — since Step 11
    // — the tray row want that click.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      // Space lifts, Enter selects. Both start a drag by default, which left a
      // keyboard user no way to reach the highlight at all: the sensor calls
      // `preventDefault()` on activation, so the button's own click never
      // fires. Dropping Enter from `start` hands it back to the button.
      //
      // Space is the one that stayed with the drag because dnd-kit's built-in
      // screen-reader instructions — read out on focus — say "to pick up a
      // draggable item, press the space bar". The instructions below add the
      // other half rather than contradicting this one.
      keyboardCodes: {
        start: ["Space"],
        cancel: ["Escape"],
        end: ["Space", "Tab"],
      },
    }),
  );

  /**
   * The single way anything changes, whichever door it came through.
   *
   * Everything here happens inside one transition, and the order matters.
   * `apply` is only allowed to be called from inside one — that's how React
   * knows when the optimistic value has expired. The await keeps the transition
   * open for the round trip, and Next.js commits the re-rendered page inside it
   * too, so a sticker is drawn continuously: optimistic first, real second, no
   * frame in between where it's missing.
   */
  function commit(change: CalendarChange) {
    startTransition(async () => {
      apply(change);
      const result = await runChange(change);
      setError(result.ok ? null : result.message);
    });
  }

  function handleDragStart(event: DragStartEvent) {
    setDragging(readDragPayload(event.active.data.current));
  }

  function handleDragEnd(event: DragEndEvent) {
    setDragging(null);

    const payload = readDragPayload(event.active.data.current);
    // Released over nothing. `over` is null, and that is the whole check.
    if (!payload || typeof event.over?.id !== "string") return;
    const day = event.over.id;

    // A drag says what was dropped where; `commit` decides what that means.
    commit(
      payload.kind === "mood"
        ? { kind: "mood", day, mood: payload.mood }
        : {
            kind: "place",
            day,
            activityId: payload.activityId,
            face: payload.face,
          },
    );
  }

  return (
    <DndContext
      // Not decoration, and not optional. dnd-kit stamps every draggable with
      // `aria-describedby="DndDescribedBy-N"`, where N comes from a counter
      // living in a module variable. On the client that module is fresh, so N
      // starts at 0. On the server the module is cached for the life of the
      // Node process, so N keeps climbing with every request — the second
      // render of this page sends `-1`, the third `-2`, and hydration finds an
      // attribute that doesn't match what it computed. Passing an id of our own
      // makes dnd-kit use it verbatim instead of counting, so both sides agree.
      id="calendar-board"
      sensors={sensors}
      collisionDetection={collisionDetection}
      accessibility={{ announcements, screenReaderInstructions }}
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
            onOpenDay={setOpenDay}
            highlight={highlight}
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
          <StickerTray
            groups={props.groups}
            selection={selection}
            onSelect={setSelection}
            onClear={() => setSelection(null)}
            label={highlight?.label ?? null}
          />

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

      {/* The second door. It reads the same optimistic Map the grid draws from
          and reports back through the same `commit`, so a sticker ticked here
          and a sticker dropped over there are indistinguishable by the time
          anything acts on them. */}
      <DayModal
        day={openDay}
        stickers={
          openDay ? (stickersByDay.get(openDay) ?? NO_STICKERS) : NO_STICKERS
        }
        groups={props.groups}
        onClose={() => setOpenDay(null)}
        onCommit={commit}
      />
    </DndContext>
  );
}

/**
 * What a screen reader is told the moment a tray row takes focus.
 *
 * dnd-kit ships this sentence and it's good, but as of Step 11 it's no longer
 * the whole truth: the same button now does two things depending on which key
 * you press. Overriding it is the only way that second thing is discoverable
 * without sight — the highlight is pure colour, and a keyboard user who never
 * learns about Enter never finds the feature at all.
 */
const screenReaderInstructions = {
  draggable: `
    To highlight every day this appears on, press Enter. Press Enter again to clear it.
    To pick up a draggable item, press the space bar.
    While dragging, use the arrow keys to move the item.
    Press space again to drop the item in its new position, or press escape to cancel.
  `,
};

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
