import type { DayString } from "@/lib/dates";
import { MOOD_LABEL, isMood, type Mood } from "@/lib/moods";
import type { StickerFace } from "@/lib/stickers";

/** What a drag carries in dnd-kit `data`: tray, overlay and drop handler share it. */
export type DragPayload =
  | {
      kind: "activity";
      activityId: string;
      face: StickerFace;
      /** Source day if dragged off the calendar: drop = move, miss = remove. */
      from?: DayString;
    }
  | { kind: "mood"; mood: Mood };

/** Narrows dnd-kit's untyped `data`; this is where `any` stops. */
export function readDragPayload(data: unknown): DragPayload | null {
  if (!data || typeof data !== "object") return null;
  const value = data as Partial<DragPayload>;

  if (value.kind === "activity") {
    if (typeof value.activityId !== "string" || !value.face) return null;
    return {
      kind: "activity",
      activityId: value.activityId,
      face: value.face,
      // Absent means "from the tray"; drop non-string origins.
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
