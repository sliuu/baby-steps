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
  moveActivity,
  placeActivity,
  removeActivity,
  setDayMood,
  type PlaceResult,
} from "@/app/actions/stickers";
import { DayModal } from "@/components/calendar/DayModal";
import { MonthGrid, type Landed } from "@/components/calendar/MonthGrid";
import { MoodMark } from "@/components/calendar/MoodMark";
import { StickerMark } from "@/components/calendar/StickerMark";
import { StickerTray } from "@/components/tray/StickerTray";
import { applyChange, type CalendarChange } from "@/lib/changes";
import { formatDayLong, toMonthString, type DayString } from "@/lib/dates";
import { buildHighlight, type Selection } from "@/lib/highlight";
import { TRAY_INSET } from "@/lib/layout";
import type { LibraryGroup } from "@/lib/queries/activities";
import { NO_STICKERS, type StickersByDay } from "@/lib/stickers";
import { readDropTarget, type DropTarget } from "./dropTarget";
import { snapToCursor } from "./snapToCursor";
import { payloadName, readDragPayload, type DragPayload } from "./payload";

type Props = {
  groups: LibraryGroup[];
  stickersByDay: StickersByDay;
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

    // `rect.left` is the centre, because the box has no width.
    const dx = pointer.x - rect.left;
    // Vertical distance counts quadruple. A day's marks wrap onto several
    // lines, and 30px of line height is small next to 85px of width — so plain
    // distance lets the last gap on the line above win while the cursor is
    // clearly on the line below. Weighting the axis that separates rows keeps
    // the caret on the row you're pointing at.
    const dy = (pointer.y - (rect.top + rect.height / 2)) * 4;

    const distance = dx * dx + dy * dy;
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

  /**
   * Escape clears it, which is the third way out after pressing the lit row's
   * eye again and the "clear" link in the tray header.
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
      const result = await runChange(change);
      setError(result.ok ? null : result.message);
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
            onCommit={commit}
            highlight={highlight}
            target={target}
            // A mood lands on the day, not in it. The square lights up either
            // way; the caret only appears when there is really an order about
            // to change.
            caret={dragging?.kind === "activity"}
            landed={landed}
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
            markCounts={markCounts}
            onError={setError}
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
      <DragOverlay
        dropAnimation={null}
        // The overlay's box is dnd-kit's copy of the box you picked *from*, and
        // a tray row is ten times the width of the circle inside it. Left at
        // that size the wrapper is a 288px invisible slab with a 26px mark
        // pinned to its left edge. `max-content` shrinks it to the mark, which
        // is what makes the modifier below able to centre it: you can't put the
        // middle of a box under the cursor while the box is mostly empty.
        style={{ width: "max-content", height: "max-content" }}
        modifiers={[snapToCursor]}
      >
        {dragging && (
          <div
            // Just the mark. No card, no border, no name — whatever you picked
            // up, what's under the cursor is the thing itself.
            //
            // It used to be a copy of the tray row, name and all, and that was
            // right while the tray was the only place a drag could start. Once
            // a mark could be lifted off the calendar the same overlay was
            // drawing two different gestures: a labelled card for one, and for
            // the other a labelled card standing in for a 26px circle four
            // times smaller than it. The card was also the reason the collision
            // rule had to move to `pointerWithin` in the first place — a wide
            // box under a cursor is a lie about where the cursor is. Dropping
            // it makes the two drags identical, which they always were, and
            // makes the thing in the air the size of the hole it's going into.
            //
            // The three states survive the loss of the border, because they
            // were never really about the border. Over a day: full strength,
            // with a shadow — a thing about to be put down. Outside: pale, no
            // shadow, nothing will land. Outside *and* lifted off a day, which
            // is the gesture that deletes: pale, plus a red ring. Same circle,
            // same size, in all three; only weight and hue move, because
            // anything that changed size mid-drag would shift under the cursor
            // at the exact moment you're aiming it.
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
