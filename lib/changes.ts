// `import type` only: Node strips it, so `changes.test.ts` runs without `@/`.
import type { DayString } from "@/lib/dates";
import type { Mood } from "@/lib/moods";
import type { StickersByDay, StickerFace } from "@/lib/stickers";

/** Every day edit as one value; drag and modal both feed `commit()` in `CalendarBoard`. */
export type CalendarChange =
  /** `index` is required: 0 first, day length last. */
  | {
      kind: "place";
      day: DayString;
      activityId: string;
      face: StickerFace;
      index: number;
    }
  | { kind: "remove"; day: DayString; activityId: string }
  /** One update, not remove+place: keeps the row id. `from === to` reorders. */
  | {
      kind: "move";
      from: DayString;
      to: DayString;
      activityId: string;
      face: StickerFace;
      index: number;
    }
  | { kind: "mood"; day: DayString; mood: Mood }
  | { kind: "clearMood"; day: DayString }
  /** `""` means cleared: null locally, a delete in the db. */
  | { kind: "note"; day: DayString; note: string };

/** Optimistic redraw mirroring `app/actions/stickers.ts`; never mutates. */
export function applyChange(
  byDay: StickersByDay,
  change: CalendarChange,
): StickersByDay {
  // The only change about two days.
  if (change.kind === "move") return moveSticker(byDay, change);

  const current = byDay.get(change.day) ?? {
    activities: [],
    mood: null,
    note: null,
  };
  const next = new Map(byDay);

  switch (change.kind) {
    case "mood":
      next.set(change.day, { ...current, mood: change.mood });
      return next;

    case "note": {
      const note = change.note.trim() === "" ? null : change.note;
      if (current.note === note) return byDay;
      next.set(change.day, { ...current, note });
      return next;
    }

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
          // Temp id for React's key. `...face` must come first: it can carry the
          // activity's `id`, which broke tray dragging until reload.
          { ...face, id: `pending:${change.day}:${activityId}`, activityId },
        ),
      });
      return next;
    }
  }
}

/** Insert at a clamped index (the day may have shrunk mid-drag). */
function spliced<T>(list: readonly T[], index: number, item: T): T[] {
  const at = Math.max(0, Math.min(index, list.length));
  return [...list.slice(0, at), item, ...list.slice(at)];
}

/** Keeps the placement's real `id`. Onto a day that has it: a merge. */
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

  // Same day: the caret counts the dragged mark's old slot, so shift by one.
  if (from === to) {
    const was = source.activities.indexOf(moving);
    // Either caret beside the mark means "leave it"; same Map, no repaint.
    if (index === was || index === was + 1) return byDay;

    const next = new Map(byDay);
    next.set(from, {
      ...source,
      activities: spliced(rest, index > was ? index - 1 : index, moving),
    });
    return next;
  }

  const target = byDay.get(to) ?? { activities: [], mood: null, note: null };
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
