// Every import here is `import type`, and that is load-bearing twice over.
// Types are erased, so nothing in this file pulls a module into a bundle — and
// Node's type stripping erases a whole `import type` statement, so
// `changes.test.ts` can run this file directly without anything resolving the
// `@/` alias. A `import { type X }` would leave the statement behind at runtime
// and break both.
import type { DayString } from "@/lib/dates";
import type { Mood } from "@/lib/moods";
import type { StickersByDay, StickerFace } from "@/lib/stickers";

/**
 * Everything that can happen to a day, as one value.
 *
 * There are two doors into the same room now — drag a sticker onto a cell, or
 * open the cell and tick a box — and the whole point of this type is that they
 * meet immediately. A drag builds one of these, the modal builds one of these,
 * and from there a single `commit()` in `CalendarBoard` does the optimistic
 * redraw, calls the matching action, and reports the failure. Neither door has
 * rules of its own, so neither can drift from the other.
 *
 * `place` carries a `face` that the other three don't need. That's not
 * asymmetry for its own sake: drawing a sticker that isn't in the map yet needs
 * its name, mark, and colour, while removing one only needs to know which row
 * to drop. The union is what lets each branch ask for exactly its own
 * ingredients instead of one wide shape with three optional fields.
 */
export type CalendarChange =
  /**
   * `index` is where in the day's row it lands — 0 is first, and the length of
   * the day is last. It is not optional, and that's the deliberate part: an
   * optional index would make "the end" the silent default, and the whole point
   * of this field is that the caller looked at where the cursor was. A drop on
   * a day's empty space still names an index; it just names the last one.
   */
  | {
      kind: "place";
      day: DayString;
      activityId: string;
      face: StickerFace;
      index: number;
    }
  | { kind: "remove"; day: DayString; activityId: string }
  /**
   * One mark, carried to a slot — on another day, or on its own.
   *
   * Not a `remove` followed by a `place`, and the difference is a row id. In the
   * database this is an `update … set day = $to` on the placement that already
   * exists, so the mark keeps its identity — which matters here for the same
   * reason it matters there: React keys off `id`, and a delete-then-insert would
   * unmount the circle and mount a different one in the next cell. Two writes
   * would also be two round trips that can half-fail, leaving a mark on both
   * days or on neither.
   *
   * `from === to` is a rearrange rather than a no-op, which is the one change
   * this variant grew. It used to return early on a same-day drop because there
   * was nothing a move could mean within a day; now it means "put it in this
   * slot". Keeping it in `move` rather than adding a `reorder` variant is not
   * tidiness — it's that every caller builds the same thing either way. The
   * gesture is identical, the cursor decides which one it was, and a separate
   * variant would make the drag handler branch on a distinction the user never
   * makes.
   *
   * It carries `face` for the same reason `place` does — the target day may
   * never have been drawn before.
   */
  | {
      kind: "move";
      from: DayString;
      to: DayString;
      activityId: string;
      face: StickerFace;
      index: number;
    }
  | { kind: "mood"; day: DayString; mood: Mood }
  | { kind: "clearMood"; day: DayString };

/**
 * The optimistic redraw: the calendar as it will look once `change` lands.
 *
 * This is the only place that duplicates what the server will do, so it holds
 * the same rules as the actions in `app/actions/stickers.ts` — a mood replaces,
 * an activity that's already on the day changes nothing. Two copies of one rule
 * is the real price of drawing before the database answers, and keeping them in
 * one small pure function is what makes the pair checkable.
 *
 * It lives beside the union rather than in `CalendarBoard` for exactly that
 * reason. It is about days and stickers, not about drag-and-drop or React, and
 * out here it can be run by a test file with no DOM and no bundler.
 *
 * A new Map and new objects along the path that changed, never a mutation of
 * what came in. React compares by identity to decide what to re-render, so
 * pushing onto the existing array would draw nothing at all — and it would also
 * corrupt the server's copy, which is what we fall back to when a write fails.
 *
 * The three branches that can be no-ops return `byDay` itself rather than the
 * copy. Same identity in means React re-renders nothing, which is exactly right
 * for ticking a box that was already ticked.
 */
export function applyChange(
  byDay: StickersByDay,
  change: CalendarChange,
): StickersByDay {
  // Taken first because it is the one change about *two* days — every branch
  // below reads a single `change.day`, and a move has a `from` and a `to`
  // instead. Splitting it out is what keeps the other four one-liners.
  if (change.kind === "move") return moveSticker(byDay, change);

  const current = byDay.get(change.day) ?? { activities: [], mood: null };
  const next = new Map(byDay);

  switch (change.kind) {
    case "mood":
      next.set(change.day, { ...current, mood: change.mood });
      return next;

    case "clearMood":
      if (current.mood === null) return byDay;
      next.set(change.day, { ...current, mood: null });
      return next;

    case "remove": {
      const activities = current.activities.filter(
        (sticker) => sticker.activityId !== change.activityId,
      );
      if (activities.length === current.activities.length) return byDay;
      next.set(change.day, { ...current, activities });
      return next;
    }

    case "place": {
      const { activityId, face } = change;
      if (
        current.activities.some((sticker) => sticker.activityId === activityId)
      ) {
        return byDay;
      }
      next.set(change.day, {
        ...current,
        activities: spliced(
          current.activities,
          change.index,
          // There is no day_activities row yet, so there is no real id to use.
          // This one only has to be unique among its siblings for React's key,
          // and only has to survive until the server's answer replaces the Map.
          //
          // `...face` comes FIRST and that is the whole point. It used to come
          // last, and because `face` arrives from the tray as a whole
          // `LibrarySticker` it carries an `id` of its own — the *activity*
          // uuid — which quietly overwrote the pending id below it. TypeScript
          // can't see that: `face` is typed `StickerFace`, which declares no
          // `id`, and a value assigned from a variable gets no excess-property
          // check. So the optimistic mark took the same drag id as the tray row
          // it came from, dnd-kit's draggable map is keyed by that id, and when
          // the server's real row id replaced the pending one the mark's
          // cleanup deleted the entry the tray row was still relying on. The
          // row stayed on screen, still looked draggable, and never lifted
          // again until a reload. `faceOf` at both payload sites now stops the
          // extra id travelling at all; this order is the second lock.
          { ...face, id: `pending:${change.day}:${activityId}`, activityId },
        ),
      });
      return next;
    }
  }
}

/**
 * `list` with `sticker` inserted at `index`, as a new array.
 *
 * The clamp is the whole reason this is a function. An index comes from a
 * pointer somewhere over a grid, and by the time it arrives the day underneath
 * may have fewer marks than it did when the drag started — another tab, a failed
 * write rolling back. `splice` doesn't mind: past the end it appends, negative
 * it counts backwards from the end, which is the one wrong answer of the three.
 * Clamping makes both edges mean the same thing they mean in the caret: 0 is
 * before everything, length is after everything.
 */
function spliced<T>(list: readonly T[], index: number, item: T): T[] {
  const at = Math.max(0, Math.min(index, list.length));
  return [...list.slice(0, at), item, ...list.slice(at)];
}

/**
 * A mark taking a new slot — on another day, or further along its own.
 *
 * The sticker object itself is carried across rather than rebuilt, so the
 * placement keeps its real `id` — the server is doing an update, not a delete
 * and an insert, and this is that fact drawn. There is no `pending:` id here
 * because nothing new is coming into existence.
 *
 * One no-op left, reachable by hand: dragging a mark onto a day that already
 * has it. That's the `unique (user_id, day, activity_id)` rule again, and the
 * honest answer is that the source loses its mark and the target keeps the one
 * it had — a merge, not a rejection. Same shape as `place`'s duplicate branch,
 * one day over.
 */
function moveSticker(
  byDay: StickersByDay,
  change: Extract<CalendarChange, { kind: "move" }>,
): StickersByDay {
  const { from, to, activityId, index } = change;

  const source = byDay.get(from);
  const moving = source?.activities.find(
    (sticker) => sticker.activityId === activityId,
  );
  if (!source || !moving) return byDay;

  const rest = source.activities.filter(
    (sticker) => sticker.activityId !== activityId,
  );

  // Rearranging inside one day, where the mark is both the thing being placed
  // and one of the things you're placing it between. The caret was drawn
  // against the day as it looks right now — with the dragged mark still sitting
  // in it — so an index past its old slot counts one position that is about to
  // stop existing. Subtracting it is what makes "drop the caret here" land
  // where the caret was. Skip the adjustment and every rightward drag stops one
  // short, which reads as the mark refusing to pass its neighbour.
  if (from === to) {
    const was = source.activities.indexOf(moving);
    // The two carets that mean "leave it alone": the one just before this mark
    // and the one just after it. Both describe the slot it is already in, and
    // both are easy to land on by accident — picking a mark up and putting it
    // straight back down is how a drag gets abandoned. Same Map out means the
    // cell doesn't repaint, so a cancelled drag costs nothing.
    if (index === was || index === was + 1) return byDay;

    const next = new Map(byDay);
    next.set(from, {
      ...source,
      activities: spliced(rest, index > was ? index - 1 : index, moving),
    });
    return next;
  }

  const target = byDay.get(to) ?? { activities: [], mood: null };
  const duplicate = target.activities.some(
    (sticker) => sticker.activityId === activityId,
  );

  const next = new Map(byDay);
  next.set(from, { ...source, activities: rest });
  if (!duplicate) {
    next.set(to, {
      ...target,
      activities: spliced(target.activities, index, moving),
    });
  }
  return next;
}
