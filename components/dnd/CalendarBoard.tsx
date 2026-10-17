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
import { StickerTray } from "@/components/tray/StickerTray";
import { applyChange, type CalendarChange } from "@/lib/changes";
import { formatDateNumeric, formatDayLong, fromDayString, toDayString, type DayString } from "@/lib/dates";
import { buildHighlight, type Selection } from "@/lib/highlight";
import type { LibraryGroup, LibrarySticker } from "@/lib/queries/activities";
import { faceOf, type StickersByDay } from "@/lib/stickers";
import { readDropTarget, type DropTarget } from "./dropTarget";
import { snapToCursor } from "./snapToCursor";
import { payloadName, readDragPayload, type DragPayload } from "./payload";

type Props = {
  groups: LibraryGroup[];
  stickersByDay: StickersByDay;
  /**
   * Demo mode: every change is applied here and written nowhere.
   *
   * The signed-out demo at `/demo` renders this exact board over a generated
   * year — see `lib/demo.ts` — and the whole of the difference is this flag.
   * That is the reason it is a flag rather than a second board: a demo you have
   * to maintain alongside the real thing is a demo that drifts, and the first
   * thing it stops showing is whatever changed last week.
   *
   * What it turns off is the network, nothing else. Dragging, the caret, the
   * landing animation, the day modal, moods, notes and the highlight all run
   * unchanged, because none of them ever asked the server anything — `commit`
   * is the single place that did. The library is not editable in a demo; see
   * `StickerTray`'s own `local`.
   */
  local?: boolean;
};

/**
 * How long a mark's landing animation runs, matching `--dur-land` in
 * globals.css.
 *
 * Written twice, in two languages, which is worth being honest about: CSS owns
 * the animation and JavaScript owns the cleanup, and neither can read the
 * other's value without either a `getComputedStyle` call on every placement or
 * a stylesheet generated from a module. Both cost more than they're worth for
 * one number. The failure if they drift is mild and self-correcting — too short
 * and the animation is cut off, too long and the class lingers on a finished
 * element — so the comment on each is the link between them.
 */
const LANDING_MS = 420;

/**
 * Where a change puts a mark, or null if it doesn't put one anywhere.
 *
 * `move` reads `to` rather than `from`: the animation belongs to the arrival.
 * Removals and mood changes get nothing — a mood is painted on the day as a
 * whole and has no mark to land, and a removal is the opposite of an arrival.
 */
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

/** Which action a change is. The only place the two are matched up. */
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
 * The pointer's rule for a pointer, the keyboard's rule for a keyboard.
 *
 * `closestCenter` compares the centre of the *dragged* thing to the centre of
 * each day. That's wrong for a pointer here: the overlay is a whole tray row,
 * so its centre can sit a hundred pixels from your cursor and the wrong square
 * lights up. `pointerWithin` asks the only question a mouse user is asking —
 * which cell is under the tip? — and it's exact.
 *
 * This used to be written as a *fallback*: `pointerWithin`, and `closestCenter`
 * whenever it came back empty. That reads as "cover the keyboard case too", and
 * it quietly did something else — `pointerWithin` returns empty every time the
 * cursor is outside the grid, so the fallback fired there as well and handed
 * back the nearest square. Releasing over the tray, the header, or the margin
 * dropped a sticker on whichever border cell happened to be closest. There was
 * no way to abandon a drag with the mouse, and the one you thought you'd
 * abandoned had already landed somewhere.
 *
 * The discriminator is `pointerCoordinates`, which is null for exactly one
 * reason: dnd-kit derives it from the activator event's `clientX`/`clientY`, and
 * a `KeyboardEvent` has neither, so `getEventCoordinates` returns null. Checked
 * in `@dnd-kit/utilities`, not assumed. So the two branches are now "is there a
 * pointer at all" rather than "did the pointer find anything" — and an empty
 * result from `pointerWithin` means what it says: nothing here to drop on.
 *
 * A keyboard drag keeps `closestCenter` and can never be "outside", which is
 * right — there's no cursor to be outside with, and Escape is already its way
 * out.
 *
 * What's new is the second half. There are two kinds of droppable in this
 * context now — days, and the gaps between the marks on a day — and they answer
 * different questions. `pointerWithin` still answers the first, over cells
 * only, because a gap has no width and so contains no pointer ever. The gaps
 * are then measured directly: nearest centre inside the day the cursor is
 * actually in.
 *
 * Two rules rather than one pass over everything, because "which day" and
 * "where in it" fail differently. Nearest-gap alone would happily hand back a
 * slot in the cell next door when the cursor sat in a margin; asking the day
 * first means the answer is always inside the square that's lit up.
 */
const collisionDetection: CollisionDetection = (args) => {
  const cells = args.droppableContainers.filter(
    (container) => container.data.current?.kind !== "slot",
  );

  if (!args.pointerCoordinates) {
    // No cursor, so no gaps to aim at: a keyboard drag picks whole squares and
    // `readDropTarget` reads a bare cell as the end of the day.
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

    // `droppableRects`, not the container's own `rect.current`. The map is what
    // dnd-kit measured when this drag began, and it's the same source both
    // built-in algorithms read — taking the rect from anywhere else is how the
    // caret and the lit square end up disagreeing after the page scrolls.
    const rect = args.droppableRects.get(container.id);
    if (!rect) continue;

    // The slot has no extent along the axis it divides, so on that axis the
    // near edge *is* the centre; on the other axis the centre has to be
    // computed. Which is which is what `axis` says — see `DropSlot`.
    //
    // The cross axis counts quadruple, and it's the weighting rather than the
    // distance that makes the caret land where you're pointing. In a month
    // cell a day's marks wrap onto several lines, and 30px of line height is
    // small next to 85px of width, so plain distance lets the last gap on the
    // line above win while the cursor is clearly on the line below. In a week
    // column the same thing happens transposed: the slots are as wide as the
    // column, so without the weighting the caret would rather jump a row than
    // notice you had moved sideways within one.
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
 * saved Map and a reducer, and hands back a Map that includes drops still in
 * flight. A successful write is folded into that saved Map; a failed one is
 * not, so the optimistic value rolls back when its transition expires. This
 * avoids re-rendering and re-querying the entire route after every small edit.
 */
export function CalendarBoard(props: Props) {
  const { snapshot, setSnapshot } = useCalendarData();
  /**
   * The last confirmed copy of the calendar. In the app, a successful Server
   * Action advances it; in the demo, the local change does. If a wider server
   * refresh replaces the prop (for example after editing a sticker), reset to
   * that authoritative snapshot.
   */
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
  /**
   * Where a release would land right now, or null when it would land nowhere.
   *
   * `over` lives inside dnd-kit and the `DragOverlay`'s children aren't given
   * it, so it gets mirrored out here. It used to be a bare boolean, for the
   * overlay's benefit only — the day itself lit up from its own `isOver`, so
   * nothing out here needed to know *which* day. Slots changed that: on a
   * pointer drag the thing dnd-kit calls `over` is a gap inside a cell, and the
   * cell's own `isOver` goes false. So this is now the single answer that the
   * overlay, the lit square, and the caret all read.
   */
  const [target, setTarget] = useState<DropTarget | null>(null);
  /**
   * The mark that just arrived, so it can be animated into place — and nothing
   * else on the calendar with it.
   *
   * This is state rather than dnd-kit's own drop animation on purpose. dnd-kit
   * flies the overlay back to the element it was picked *up* from, which is
   * right for a reorder and wrong for everything else here: a sticker dragged
   * out of the tray would sail back into the rail at the exact moment it should
   * be settling onto a Tuesday. `dropAnimation={null}` turns that off, and this
   * puts the motion where the result is instead of where the gesture was.
   *
   * It also covers the arrivals that were never a drag at all. Ticking an
   * activity in the day modal places a sticker with no gesture behind it, and
   * that mark should land the same way the dragged one does — the animation is
   * about the outcome, not the input.
   */
  const [landed, setLanded] = useState<Landed | null>(null);
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
   * How many days each sticker is on, for the delete confirmation in the tray.
   *
   * Built from the optimistic Map rather than the prop, so a mark dropped a
   * second ago is already in the number the warning quotes. One pass over data
   * this component is holding anyway — the same argument `tally` makes for
   * grouping in the browser instead of asking Postgres for a `group by`.
   */
  const markCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const [, day] of stickersByDay) {
      for (const sticker of day.activities) {
        // The activity, not the placement. Counting `sticker.id` would count
        // every mark as its own sticker and report 1 for all of them.
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
    // Four pixels of travel before a press counts as a drag. Without it every
    // click on a sticker starts one, and both the day cell and — since Step 11
    // — the tray row want that click.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      // Space lifts, Enter opens. Both start a drag by default, and the sensor
      // calls `preventDefault()` on activation, so the button's own click never
      // fires — which left a keyboard user unable to reach whatever the row's
      // click meant. Dropping Enter from `start` hands it back to the button.
      // In Step 11 that was the highlight; it's the editor now, and the swap
      // needed no change here, which is the sign the seam was in the right
      // place.
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
    // Outside the transition, so the flag is set in the same render as the
    // optimistic sticker rather than a frame later — the class has to be on the
    // element the first time it paints, or the animation starts from a mark
    // that's already sitting there.
    setLanded(arrivalOf(change));

    startTransition(async () => {
      apply(change);
      // A demo's truth is the state above, so folding the change into it is the
      // whole of the write. The optimistic value expires a moment later and
      // falls back to a `saved` that already contains the change — the same
      // handoff the server does, with the round trip taken out.
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

  /**
   * Clear the flag once the animation has had time to finish.
   *
   * A timer rather than `onAnimationEnd`, because the element the animation
   * runs on may not survive it — a cross-month move unmounts the mark
   * mid-flight, and an event that fires on a removed node never arrives. The
   * timer is owned by the effect, so a second placement before the first has
   * expired cancels the old one on the way in.
   *
   * Slightly longer than the animation so it's the animation that ends the
   * motion, not the cleanup. Both come from the same token, so a change to
   * either stays in step.
   */
  useEffect(() => {
    if (!landed) return;
    const timer = window.setTimeout(() => setLanded(null), LANDING_MS + 80);
    return () => window.clearTimeout(timer);
  }, [landed]);

  function handleDragStart(event: DragStartEvent) {
    setDragging(readDragPayload(event.active.data.current));
    // A drag starts over nothing — even one lifted off a day, because dnd-kit
    // hasn't hit-tested yet. Cleared explicitly rather than left over from last
    // time: `onDragOver` fires on *changes*, so a drag that begins and ends
    // outside the grid never fires it at all.
    setTarget(null);
  }

  /**
   * Where it was dropped, and where it came from, decide between four things.
   *
   * The grid became a drag *source* as well as a target in Step 16, and that one
   * change doubled this function. The same two questions now have four answers:
   *
   *                     from the tray        from a day
   *   onto a day        place                move
   *   onto nothing      cancel               remove
   *
   * Which is why `from` travels in the payload. Note the diagonal: releasing over
   * empty space is a no-op in one column and a deletion in the other, so it is
   * the only gesture on the page whose meaning depends on where it began. The
   * overlay has to say which one is about to happen, because by the time you find
   * out from the calendar it has already happened.
   */
  function handleDragEnd(event: DragEndEvent) {
    setDragging(null);
    setTarget(null);

    const payload = readDragPayload(event.active.data.current);
    if (!payload) return;
    const landed = readDropTarget(event.over);

    // Released over nothing. Dragged off the calendar, that's the delete gesture
    // — the sticker was carried out of the month and let go. Out of the tray it
    // is still just a change of mind.
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

    // A drag says what was dropped where; `commit` decides what that means.
    // A mood ignores the slot half of the answer: `unique (user_id, day)` means
    // a day holds one, so there is nowhere in a day for it to be.
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

  /**
   * The overlay is about to be a deletion rather than a cancellation.
   *
   * Two facts, and neither is enough alone: the thing in the air came off a day
   * (`from`), and it is currently over nothing. Derived at render rather than
   * stored, because both halves are already state — a third piece of state
   * holding their conjunction is a thing that can disagree with them.
   */
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
      dragScope={scope}
    />
  );

  const errorLine = error && (
    <p className="mt-6 rounded-md bg-ramp-red-soft px-3 py-2 text-label">{error}</p>
  );

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
      onDragOver={(event) => setTarget(readDropTarget(event.over))}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setDragging(null);
        setTarget(null);
      }}
    >
      <CalendarPanel
        initialDay={toDayString(new Date())}
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
      />

      {onToday && (
        // Under Today at every width, past a rule.
        <section
          id="your-stickers"
          aria-label="your stickers"
          className="mt-14 scroll-mt-6 border-t border-rule pt-10"
        >
          {tray("page", toDayString(new Date()))}
        </section>
      )}

      {/* Desktop's error line, under the content. One live region per width. */}
      <div role="status" aria-live="polite" className="hidden lg:block">
        {errorLine}
      </div>

      {/* Phone copy: pinned top, above the sheet (z-60). The sheet has its own sr-only copy. */}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-0 z-60 px-3 pt-[calc(0.75rem+env(safe-area-inset-top))] lg:hidden"
      >
        {error && (
          <p className="mx-auto max-w-[34rem] rounded-md bg-ramp-red-soft px-3 py-2 text-label shadow-[0_4px_16px_rgb(70_50_20/0.18)]">
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
          // Over a day: full + shadow. Outside: pale. Outside and lifted off a day (a delete): red ring.
          <div
            className={`rounded-full transition-opacity ${
              target
                ? "opacity-100 drop-shadow-md"
                : `opacity-50 ${leaving ? "ring-2 ring-ramp-red" : ""}`
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

/**
 * What a screen reader is told the moment a tray row takes focus.
 *
 * This used to open with "To highlight every day this appears on, press Enter",
 * because in Step 11 that was the only way anyone without sight could find the
 * highlight: it was a feature made of colour, triggered by a key nothing
 * mentioned. The sentence was a workaround for a missing affordance.
 *
 * The eye button beside each row is that affordance, and it's a labelled toggle
 * one Tab away — so the instruction had nothing left to teach and went back to
 * dnd-kit's own, which covers the part that really is invisible. Worth noticing
 * as a pattern: **prose that explains an interaction is usually a control that
 * hasn't been built yet.**
 */
const screenReaderInstructions = {
  draggable: `
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
 *
 * Each one branches on origin for the same reason the overlay's border does:
 * releasing over nothing cancels a tray drag and deletes a placed mark, and
 * "let go to cancel" said over a deletion would be a lie told at the exact
 * moment it can't be checked. The sighted version of this warning is a red
 * dashed border; this is that border, in words.
 */
const announcements: Announcements = {
  onDragStart: ({ active }) => {
    const payload = readDragPayload(active.data.current);
    if (!payload) return;
    return payload.kind === "activity" && payload.from
      ? `Picked up ${payloadName(payload)} from ${formatDayLong(payload.from)}.`
      : `Picked up ${payloadName(payload)}.`;
  },
  // `over.id` is no longer the day. It's a slot id most of the time — the gaps
  // between marks are droppables too — so the day comes back through
  // `readDropTarget`, which is the same function the drop handler uses. Reading
  // the id directly here would have kept compiling and started announcing
  // "slot:2026-08-20:1" out loud.
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
