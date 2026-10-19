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
import {
  useEffect,
  useMemo,
  useOptimistic,
  useState,
  useTransition,
} from "react";

import {
  clearDayMood,
  moveActivity,
  placeActivity,
  removeActivity,
  setDayMood,
  setDayNote,
  type PlaceResult,
} from "@/app/actions/stickers";
import { CalendarPanel } from "@/components/calendar/CalendarPanel";
import { useCalendarData } from "@/components/calendar/calendarData";
import { MoodMark } from "@/components/calendar/MoodMark";
import { StickerMark } from "@/components/calendar/StickerMark";
import { LANDING_VIEW, type Landed } from "@/components/calendar/period";
import { useCalendarView } from "@/components/calendar/viewMode";
import { AddStickersSheet } from "@/components/tray/AddStickersSheet";
import { StickerTray } from "@/components/tray/StickerTray";
import { applyChange, type CalendarChange } from "@/lib/changes";
import { formatDateNumeric, formatDayLong, fromDayString, type DayString } from "@/lib/dates";
import { buildHighlight, type Selection } from "@/lib/highlight";
import type { LibraryGroup, LibrarySticker } from "@/lib/queries/activities";
import { faceOf, type StickersByDay } from "@/lib/stickers";
import { readDropTarget, type DropTarget } from "./dropTarget";
import { snapToCursor } from "./snapToCursor";
import { CalendarSkeleton } from "@/components/views/CalendarSkeleton";
import { useToday } from "@/lib/useToday";
import { payloadName, readDragPayload, type DragPayload } from "./payload";

type Props = {
  groups: LibraryGroup[];
  stickersByDay: StickersByDay;
  // Demo mode: every change is applied here and written nowhere.
  local?: boolean;
};

/** Matches `--dur-land` in globals.css. */
const LANDING_MS = 420;

/** Where a change lands a mark (move uses `to`); null for removals and moods. */
function arrivalOf(change: CalendarChange): Landed | null {
  switch (change.kind) {
    case "place":
      return { day: change.day, activityId: change.activityId };
    case "move":
      return { day: change.to, activityId: change.activityId };
    default:
      return null;
  }
}

function runChange(change: CalendarChange): Promise<PlaceResult> {
  switch (change.kind) {
    case "place":
      return placeActivity(change.day, change.activityId, change.index);
    case "remove":
      return removeActivity(change.day, change.activityId);
    case "move":
      return moveActivity(
        change.from,
        change.to,
        change.activityId,
        change.index,
      );
    case "mood":
      return setDayMood(change.day, change.mood);
    case "clearMood":
      return clearDayMood(change.day);
    case "note":
      return setDayNote(change.day, change.note);
  }
}

/**
 * Pointer: `pointerWithin` over cells, then the nearest slot in that cell.
 * Never fall back to `closestCenter` for a pointer, or releasing off-grid drops
 * on the nearest border cell. Keyboard (no pointerCoordinates): `closestCenter`.
 */
const collisionDetection: CollisionDetection = (args) => {
  const cells = args.droppableContainers.filter(
    (container) => container.data.current?.kind !== "slot",
  );

  if (!args.pointerCoordinates) {
    // Keyboard: whole cells; `readDropTarget` reads a bare cell as end of day.
    return closestCenter({ ...args, droppableContainers: cells });
  }

  const [cell] = pointerWithin({ ...args, droppableContainers: cells });
  if (!cell) return [];

  const pointer = args.pointerCoordinates;
  let nearest = null;
  let shortest = Infinity;

  for (const container of args.droppableContainers) {
    const data = container.data.current;
    if (data?.kind !== "slot" || data.day !== cell.id) continue;

    // `droppableRects` (measured at drag start), or caret and lit cell drift on scroll.
    const rect = args.droppableRects.get(container.id);
    if (!rect) continue;

    // Slots have no extent on their axis, so near edge = centre. Cross axis is
    // weighted 4x so the caret follows the line/column you're actually on.
    const block = data.axis === "block";
    const along = block ? pointer.y - rect.top : pointer.x - rect.left;
    const across = block
      ? (pointer.x - (rect.left + rect.width / 2)) * 4
      : (pointer.y - (rect.top + rect.height / 2)) * 4;

    const distance = along * along + across * across;
    if (distance < shortest) {
      shortest = distance;
      nearest = container;
    }
  }

  return nearest ? [{ id: nearest.id }] : [cell];
};

/** Owns the DndContext (tray and grid must share it) and the optimistic calendar. */
export function CalendarBoard(props: Props) {
  const { snapshot, setSnapshot } = useCalendarData();
  // Last confirmed calendar; reset when a server refresh replaces the prop.
  const [saved, setSaved] = useState(
    snapshot?.source === props.stickersByDay
      ? snapshot.data
      : props.stickersByDay,
  );
  const [savedSource, setSavedSource] = useState(
    props.stickersByDay,
  );
  if (savedSource !== props.stickersByDay) {
    setSavedSource(props.stickersByDay);
    setSaved(props.stickersByDay);
  }
  const [stickersByDay, apply] = useOptimistic(saved, applyChange);
  const [dragging, setDragging] = useState<DragPayload | null>(null);

  // Which view; owned by the top nav. Decides where the tray goes.
  const view = useCalendarView();
  const [error, setError] = useState<string | null>(null);
  // Mirrored out of dnd-kit: overlay, lit cell and caret all read it.
  const [target, setTarget] = useState<DropTarget | null>(null);
  // Just-arrived mark to animate. Not dnd-kit's drop animation, which flies back to the source.
  const [landed, setLanded] = useState<Landed | null>(null);
  const [, startTransition] = useTransition();

  // Ephemeral view state: no DB, URL or storage; dies on reload.
  const [selection, setSelection] = useState<Selection | null>(null);
  // Phones: the add-stickers sheet.
  const [picking, setPicking] = useState(false);
  // Null on the server: it can't know the visitor's day.
  const todayString = useToday(null);

  // Derived, so server renames/recolours flow through; null if the target is gone.
  const highlight = useMemo(
    () => (selection ? buildHighlight(selection, props.groups) : null),
    [selection, props.groups],
  );

  // Days per sticker for the delete confirmation; optimistic so it's current.
  const markCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const [, day] of stickersByDay) {
      for (const sticker of day.activities) {
        // Per activity, not per placement.
        counts.set(
          sticker.activityId,
          (counts.get(sticker.activityId) ?? 0) + 1,
        );
      }
    }
    return counts;
  }, [stickersByDay]);

  // Escape clears the highlight; bound only while something is lit.
  useEffect(() => {
    if (!selection) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setSelection(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selection]);

  const sensors = useSensors(
    // 4px before a press is a drag, so clicks still reach cells and rows.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      // Enter left out of `start` so it reaches the row's button (opens editor).
      keyboardCodes: {
        start: ["Space"],
        cancel: ["Escape"],
        end: ["Space", "Tab"],
      },
    }),
  );

  /**
   * The single write path. `apply` must run inside the transition; awaiting keeps
   * it open so optimistic and real renders hand off with no gap.
   */
  function commit(change: CalendarChange) {
    // Outside the transition so the class is on the mark's first paint.
    setLanded(arrivalOf(change));

    startTransition(async () => {
      apply(change);
      // Demo: folding into `saved` is the whole write.
      if (props.local) {
        setSaved((current) => applyChange(current, change));
        setSnapshot((current) => {
          const base =
            current?.source === props.stickersByDay
              ? current.data
              : props.stickersByDay;
          return {
            source: props.stickersByDay,
            data: applyChange(base, change),
          };
        });
        return;
      }
      const result = await runChange(change);
      setError(result.ok ? null : result.message);
      if (result.ok) {
        setSaved((current) => applyChange(current, change));
        setSnapshot((current) => {
          const base =
            current?.source === props.stickersByDay
              ? current.data
              : props.stickersByDay;
          return {
            source: props.stickersByDay,
            data: applyChange(base, change),
          };
        });
      }
    });
  }

  // Timer, not onAnimationEnd: a cross-month move unmounts the mark mid-flight.
  // Slightly longer than the animation.
  useEffect(() => {
    if (!landed) return;
    const timer = window.setTimeout(() => setLanded(null), LANDING_MS + 80);
    return () => window.clearTimeout(timer);
  }, [landed]);

  function handleDragStart(event: DragStartEvent) {
    setDragging(readDragPayload(event.active.data.current));
    // Reset: `onDragOver` fires only on changes.
    setTarget(null);
  }

  // Tray→day: place; day→day: move; tray→nothing: cancel; day→nothing: remove.
  function handleDragEnd(event: DragEndEvent) {
    setDragging(null);
    setTarget(null);

    const payload = readDragPayload(event.active.data.current);
    if (!payload) return;
    const landed = readDropTarget(event.over);

    // Off the calendar: removes a placed mark, cancels a tray drag.
    if (!landed) {
      if (payload.kind === "activity" && payload.from) {
        commit({
          kind: "remove",
          day: payload.from,
          activityId: payload.activityId,
        });
      }
      return;
    }

    // One mood per day, so the slot index is ignored.
    if (payload.kind === "mood") {
      commit({ kind: "mood", day: landed.day, mood: payload.mood });
      return;
    }

    commit(
      payload.from
        ? {
            kind: "move",
            from: payload.from,
            to: landed.day,
            activityId: payload.activityId,
            face: payload.face,
            index: landed.index,
          }
        : {
            kind: "place",
            day: landed.day,
            activityId: payload.activityId,
            face: payload.face,
            index: landed.index,
          },
    );
  }

  // About to delete: lifted off a day and over nothing.
  const leaving = !target && dragging?.kind === "activity" && !!dragging.from;

  const onToday = (view ?? LANDING_VIEW) === "today";

  /** Tap-to-add: the same "place" a drop makes, at the end of the day. */
  function addTo(day: DayString, sticker: LibrarySticker) {
    const placed = stickersByDay.get(day)?.activities ?? [];
    // Already there: replay the land as feedback, write nothing.
    if (placed.some((p) => p.activityId === sticker.id)) {
      setLanded({ day, activityId: sticker.id });
      return;
    }
    commit({
      kind: "place",
      day,
      activityId: sticker.id,
      face: faceOf(sticker),
      index: placed.length,
    });
  }

  /** The sheet's batch: each a "place" at the end, in pick order. */
  function addMany(day: DayString, stickers: LibrarySticker[]) {
    const placed = stickersByDay.get(day)?.activities ?? [];
    stickers.forEach((sticker, i) =>
      commit({ kind: "place", day, activityId: sticker.id, face: faceOf(sticker), index: placed.length + i }),
    );
  }

  const tray = (layout: "column" | "page", day: DayString, scope?: string) => (
    <StickerTray
      groups={props.groups}
      selection={selection}
      onSelect={setSelection}
      onClear={() => setSelection(null)}
      label={highlight?.label ?? null}
      markCounts={markCounts}
      onError={setError}
      local={props.local}
      onAdd={(sticker) => addTo(day, sticker)}
      addTo={layout === "page" ? "today" : formatDateNumeric(fromDayString(day))}
      layout={layout}
      compact={layout === "column"}
      // The phone sheet can't drag, so its taps add.
      tapEdits={scope === "panel"}
      dragScope={scope}
    />
  );

  const errorLine = error && (
    <p className="mt-s4 rounded-lg bg-accent-ink/10 text-accent-ink px-s2 py-s1 text-label">{error}</p>
  );

  if (!todayString) return <CalendarSkeleton />;

  return (
    <DndContext
      // Fixed id: dnd-kit's describedby counter differs server vs client (hydration).
      id="calendar-board"
      sensors={sensors}
      collisionDetection={collisionDetection}
      accessibility={{ announcements, screenReaderInstructions }}
      onDragStart={handleDragStart}
      onDragOver={(event) => setTarget(readDropTarget(event.over))}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setDragging(null);
        setTarget(null);
      }}
    >
      <CalendarPanel
        initialDay={todayString}
        view={view}
        groups={props.groups}
        stickersByDay={stickersByDay}
        onCommit={commit}
        error={error}
        highlight={highlight}
        target={target}
        // Moods land on the day; only stickers get a caret.
        caret={dragging?.kind === "activity"}
        landed={landed}
        tray={(day, scope) => tray("column", day, scope)}
        onPickStickers={() => setPicking(true)}
      />

      {picking && (
        <AddStickersSheet
          groups={props.groups}
          placed={
            new Set(
              (stickersByDay.get(todayString)?.activities ?? []).map((a) => a.activityId),
            )
          }
          onAdd={(stickers) => addMany(todayString, stickers)}
          onClose={() => setPicking(false)}
          markCounts={markCounts}
          local={props.local}
        />
      )}

      {onToday && (
        // Under Today, past a rule. Phones use the + sheet instead.
        <section
          id="your-stickers"
          aria-label="stickers"
          className="mt-s6 hidden scroll-mt-6 border-t border-rule pt-s6 lg:block"
        >
          {tray("page", todayString)}
        </section>
      )}

      {/* Desktop's error line, under the content. One live region per width. */}
      <div role="status" aria-live="polite" className="hidden lg:block">
        {errorLine}
      </div>

      {/* Phone copy, pinned above the sheet (z-60); the sheet has an sr-only copy. */}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-0 z-60 px-s2 pt-[calc(var(--spacing-s2)+env(safe-area-inset-top))] lg:hidden"
      >
        {error && (
          <p className="mx-auto max-w-136 rounded-lg bg-accent-ink/10 text-accent-ink px-s2 py-s1 text-label shadow-menu">
            {error}
          </p>
        )}
      </div>

      {/* The floating copy; the original stays put so nothing reflows mid-drag. */}
      <DragOverlay
        dropAnimation={null}
        // Shrink to the mark so snapToCursor can centre it.
        style={{ width: "max-content", height: "max-content" }}
        modifiers={[snapToCursor]}
      >
        {dragging && (
          // Over a day: full. Outside: pale. Outside from a day (delete): red ring.
          <div
            className={`rounded-full transition-opacity ${
              target
                ? "opacity-100 drop-shadow-md"
                : `opacity-50 ${leaving ? "ring-2 ring-accent-ink" : ""}`
            }`}
          >
            {dragging.kind === "mood" ? (
              <MoodMark mood={dragging.mood} />
            ) : (
              <StickerMark sticker={dragging.face} />
            )}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

/** dnd-kit's default instructions (no Enter-to-highlight; the eye button does that). */
const screenReaderInstructions = {
  draggable: `
    To pick up a draggable item, press the space bar.
    While dragging, use the arrow keys to move the item.
    Press space again to drop the item in its new position, or press escape to cancel.
  `,
};

/** Names and dates instead of ids; branches on origin since off-grid deletes. */
const announcements: Announcements = {
  onDragStart: ({ active }) => {
    const payload = readDragPayload(active.data.current);
    if (!payload) return;
    return payload.kind === "activity" && payload.from
      ? `Picked up ${payloadName(payload)} from ${formatDayLong(payload.from)}.`
      : `Picked up ${payloadName(payload)}.`;
  },
  // `over.id` may be a slot id; read the day via `readDropTarget`.
  onDragOver: ({ active, over }) => {
    const payload = readDragPayload(active.data.current);
    if (!payload) return;
    const name = payloadName(payload);
    const landed = readDropTarget(over);
    if (landed) return `${name} is over ${formatDayLong(landed.day)}.`;
    return payload.kind === "activity" && payload.from
      ? `${name} is not over a day. Let go to take it off ${formatDayLong(payload.from)}.`
      : `${name} is not over a day. Let go to cancel.`;
  },
  onDragEnd: ({ active, over }) => {
    const payload = readDragPayload(active.data.current);
    if (!payload) return;
    const name = payloadName(payload);
    const from = payload.kind === "activity" ? payload.from : undefined;
    const landed = readDropTarget(over);

    if (landed) {
      const day = formatDayLong(landed.day);
      return from ? `${name} moved to ${day}.` : `${name} dropped on ${day}.`;
    }
    return from
      ? `${name} taken off ${formatDayLong(from)}.`
      : `${name} returned to the tray.`;
  },
  onDragCancel: ({ active }) => {
    const payload = readDragPayload(active.data.current);
    if (!payload) return;
    return `Cancelled; ${payloadName(payload)}.`;
  },
};
