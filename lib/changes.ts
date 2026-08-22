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
  | { kind: "place"; day: DayString; activityId: string; face: StickerFace }
  | { kind: "remove"; day: DayString; activityId: string }
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
        activities: [
          ...current.activities,
          // There is no day_activities row yet, so there is no real id to use.
          // This one only has to be unique among its siblings for React's key,
          // and only has to survive until the server's answer replaces the Map.
          { id: `pending:${change.day}:${activityId}`, activityId, ...face },
        ],
      });
      return next;
    }
  }
}
