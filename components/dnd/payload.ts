import type { DayString } from "@/lib/dates";
import { MOOD_LABEL, isMood, type Mood } from "@/lib/moods";
import type { StickerFace } from "@/lib/stickers";

/**
 * What a dragged thing carries with it.
 *
 * dnd-kit hands `onDragEnd` an `active` and an `over`, and the only thing it
 * knows about either is its id. Everything else has to travel in `data`. So
 * this type is the contract between the three places that would otherwise have
 * to agree by memory: the tray row that starts the drag, the overlay that draws
 * the thing mid-air, and the drop handler that decides which action to call.
 *
 * A discriminated union rather than one shape with optional fields, because the
 * two branches end at two different tables. `kind` is what makes the compiler
 * check that the drop handler covered both.
 */
export type DragPayload =
  | {
      kind: "activity";
      /** The activities row. What a drop writes into day_activities. */
      activityId: string;
      /** The three fields needed to draw it while it's in the air. */
      face: StickerFace;
      /**
       * The day this mark was picked up from, when it came off the calendar
       * rather than out of the tray.
       *
       * One optional field rather than a third `kind`, because everything else
       * about the two is identical: same circle in the air, same activity id,
       * same thing on the other end. What it changes is what the *drop* means —
       * with a `from`, landing on a day is a move and landing on nothing is a
       * removal; without one, landing on a day is a placement and landing on
       * nothing is a cancel. The handler branches on this one field, which is
       * why it's worth carrying rather than looking up.
       */
      from?: DayString;
    }
  | { kind: "mood"; mood: Mood };

/**
 * `active.data.current` is typed `Record<string, any>` by dnd-kit — it has no
 * idea what we put in there, and neither does TypeScript once it crosses that
 * boundary. This is where `any` stops.
 */
export function readDragPayload(data: unknown): DragPayload | null {
  if (!data || typeof data !== "object") return null;
  const value = data as Partial<DragPayload>;

  if (value.kind === "activity") {
    if (typeof value.activityId !== "string" || !value.face) return null;
    return {
      kind: "activity",
      activityId: value.activityId,
      face: value.face,
      // Absent is a meaning here, not a missing value — it says the tray. So an
      // origin that isn't a string is dropped rather than passed along, and the
      // drag reads as one that started in the rail.
      ...(typeof value.from === "string" ? { from: value.from } : {}),
    };
  }
  if (value.kind === "mood") {
    return typeof value.mood === "string" && isMood(value.mood)
      ? { kind: "mood", mood: value.mood }
      : null;
  }
  return null;
}

/** What to call it in a screen reader announcement. */
export function payloadName(payload: DragPayload): string {
  return payload.kind === "mood"
    ? MOOD_LABEL[payload.mood]
    : payload.face.name;
}
