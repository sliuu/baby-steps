"use server";

import type { DayString } from "@/lib/dates";
import { isMood } from "@/lib/moods";
import { NOTE_MAX } from "@/lib/stickers";
import { createClient } from "@/lib/supabase/server";

/** Returned, not thrown: a throw is opaque and hits the error boundary. */
export type PlaceResult = { ok: true } | { ok: false; message: string };

/** A Postgres `date`, nothing else. */
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Identity comes from the session, never args (actions are public POSTs).
 * Ownership is enforced by composite FKs on (activity_id, user_id), not here.
 */
async function signedInClient() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  return { supabase, userId: data?.claims.sub ?? null };
}

/** `activity_id` is required: upsert inserts first, so not-nulls must be present. */
type Placement = { id: string; day: DayString; activity_id: string };

/** Clamp a pointer slot for `splice`. */
function clamp(index: number, length: number) {
  return Math.max(0, Math.min(index, length));
}

/**
 * Write days back as dense positions in one upsert (no half-applied order).
 * Conflict on PK, not the triple, or a cross-day move inserts a duplicate.
 * `.select("id")` + count: RLS filters UPDATEs silently.
 */
async function writeOrder(
  supabase: Awaited<ReturnType<typeof signedInClient>>["supabase"],
  userId: string,
  days: { day: DayString; rows: Placement[] }[],
) {
  const payload = days.flatMap(({ day, rows }) =>
    rows.map((row, position) => ({
      id: row.id,
      user_id: userId,
      day,
      activity_id: row.activity_id,
      position,
    })),
  );
  if (payload.length === 0) return true;

  const { data, error } = await supabase
    .from("day_activities")
    .upsert(payload)
    .select("id");

  return !error && data !== null && data.length === payload.length;
}

/** Marks in draw order. */
async function readDay(
  supabase: Awaited<ReturnType<typeof signedInClient>>["supabase"],
  days: DayString[],
): Promise<Placement[] | null> {
  const { data, error } = await supabase
    .from("day_activities")
    .select("id, day, activity_id")
    .in("day", days)
    .order("position")
    .order("created_at");

  return error || data === null ? null : (data as Placement[]);
}

/**
 * Insert at `index` and renumber the day in one upsert.
 * Already there → no-op; a racing duplicate becomes a position update.
 */
export async function placeActivity(
  day: DayString,
  activityId: string,
  index: number,
): Promise<PlaceResult> {
  if (!DAY_PATTERN.test(day)) {
    return { ok: false, message: "That isn't a day." };
  }

  const { supabase, userId } = await signedInClient();
  if (!userId) return { ok: false, message: "You're signed out." };

  const existing = await readDay(supabase, [day]);
  if (existing === null) {
    return { ok: false, message: "That sticker didn't stick. Try again." };
  }
  if (existing.some((row) => row.activity_id === activityId)) return { ok: true };

  const order = existing.map((row) => row.activity_id);
  order.splice(clamp(index, order.length), 0, activityId);

  const { error } = await supabase.from("day_activities").upsert(
    order.map((id, position) => ({
      user_id: userId,
      day,
      activity_id: id,
      position,
    })),
    { onConflict: "user_id,day,activity_id" },
  );

  if (error) {
    return { ok: false, message: "That sticker didn't stick. Try again." };
  }

  return { ok: true };
}

/**
 * By (day, activity_id); unique, and the modal only knows the library.
 * No user_id filter: RLS scopes it. Leaves a position gap; only order is read.
 */
export async function removeActivity(
  day: DayString,
  activityId: string,
): Promise<PlaceResult> {
  if (!DAY_PATTERN.test(day)) {
    return { ok: false, message: "That isn't a day." };
  }

  const { supabase, userId } = await signedInClient();
  if (!userId) return { ok: false, message: "You're signed out." };

  const { error } = await supabase
    .from("day_activities")
    .delete()
    .eq("day", day)
    .eq("activity_id", activityId);

  if (error) {
    return { ok: false, message: "That sticker wouldn't come off. Try again." };
  }

  return { ok: true };
}

/**
 * Update the row (keeps its id, so React moves rather than remounts), then
 * renumber the day(s). Target already has it → merge: drop from source.
 */
export async function moveActivity(
  from: DayString,
  to: DayString,
  activityId: string,
  index: number,
): Promise<PlaceResult> {
  if (!DAY_PATTERN.test(from) || !DAY_PATTERN.test(to)) {
    return { ok: false, message: "That isn't a day." };
  }

  const { supabase, userId } = await signedInClient();
  if (!userId) return { ok: false, message: "You're signed out." };

  const failed = { ok: false, message: "That sticker wouldn't move. Try again." } as const;

  const rows = await readDay(supabase, from === to ? [from] : [from, to]);
  if (rows === null) return failed;

  const source = rows.filter((row) => row.day === from);
  const was = source.findIndex((row) => row.activity_id === activityId);
  if (was === -1) return failed;

  const moving = source[was];
  const rest = source.filter((row) => row !== moving);

  if (from === to) {
    // Index counts the dragged mark; must match `applyChange` or draws drift by one.
    rest.splice(clamp(was < index ? index - 1 : index, rest.length), 0, moving);

    // Dropped back where it was: skip the write (compared, since clamp can collapse).
    const unchanged = rest.every((row, at) => row.id === source[at].id);
    if (unchanged) return { ok: true };

    if (!(await writeOrder(supabase, userId, [{ day: from, rows: rest }]))) {
      return failed;
    }
    return { ok: true };
  }

  const target = rows.filter((row) => row.day === to);

  // Merge: target already has it, so just remove from source.
  if (target.some((row) => row.activity_id === activityId)) {
    const { error } = await supabase
      .from("day_activities")
      .delete()
      .eq("day", from)
      .eq("activity_id", activityId);
    if (error || !(await writeOrder(supabase, userId, [{ day: from, rows: rest }]))) {
      return failed;
    }
    return { ok: true };
  }

  target.splice(clamp(index, target.length), 0, moving);
  const written = await writeOrder(supabase, userId, [
    { day: from, rows: rest },
    { day: to, rows: target },
  ]);
  if (!written) return failed;

  return { ok: true };
}

/** Upsert on (user_id, day): one statement, no read-then-write race. */
export async function setDayMood(
  day: DayString,
  mood: string,
): Promise<PlaceResult> {
  if (!DAY_PATTERN.test(day)) {
    return { ok: false, message: "That isn't a day." };
  }
  // CHECK would catch it too; this gives a sentence, not a Postgres error.
  if (!isMood(mood)) {
    return { ok: false, message: "That isn't a mood." };
  }

  const { supabase, userId } = await signedInClient();
  if (!userId) return { ok: false, message: "You're signed out." };

  const { error } = await supabase
    .from("day_moods")
    .upsert({ user_id: userId, day, mood }, { onConflict: "user_id,day" });

  if (error) {
    return { ok: false, message: "That mood didn't save. Try again." };
  }

  return { ok: true };
}

/** No mood = no row; there's no sixth "none" value. */
export async function clearDayMood(day: DayString): Promise<PlaceResult> {
  if (!DAY_PATTERN.test(day)) {
    return { ok: false, message: "That isn't a day." };
  }

  const { supabase, userId } = await signedInClient();
  if (!userId) return { ok: false, message: "You're signed out." };

  const { error } = await supabase.from("day_moods").delete().eq("day", day);

  if (error) {
    return { ok: false, message: "That mood wouldn't clear. Try again." };
  }

  return { ok: true };
}

/**
 * Empty deletes the row (never store ''). Trim before length check.
 * Error names the note: unlike a sticker, it can't be redone from the screen.
 */
export async function setDayNote(
  day: DayString,
  note: string,
): Promise<PlaceResult> {
  if (!DAY_PATTERN.test(day)) {
    return { ok: false, message: "That isn't a day." };
  }

  const text = note.trim();
  if (text.length > NOTE_MAX) {
    return {
      ok: false,
      message: `That note is too long — ${NOTE_MAX} characters at most.`,
    };
  }

  const { supabase, userId } = await signedInClient();
  if (!userId) return { ok: false, message: "You're signed out." };

  const { error } = text
    ? await supabase
        .from("day_notes")
        .upsert(
          { user_id: userId, day, note: text },
          { onConflict: "user_id,day" },
        )
    : await supabase.from("day_notes").delete().eq("day", day);

  if (error) {
    return { ok: false, message: "That note didn't save. Copy it somewhere and try again." };
  }

  return { ok: true };
}
