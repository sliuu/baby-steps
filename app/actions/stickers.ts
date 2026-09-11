"use server";

import { refresh } from "next/cache";

import type { DayString } from "@/lib/dates";
import { isMood } from "@/lib/moods";
import { NOTE_MAX } from "@/lib/stickers";
import { createClient } from "@/lib/supabase/server";

/**
 * Both actions answer with this rather than throwing.
 *
 * A thrown error in a Server Action reaches the client as an opaque "an error
 * occurred" and, inside a transition, as an error boundary. Neither is what we
 * want here: a failed drop should leave the calendar standing and say one
 * sentence about it. Returning the failure keeps it a value the caller can
 * render — and `useOptimistic` still rolls the sticker back, because the
 * transition ends either way.
 */
export type PlaceResult = { ok: true } | { ok: false; message: string };

/** Exactly what Postgres stores in a `date` column, and nothing else. */
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Every Server Action is a POST endpoint that anyone can reach — the form or
 * the drag handler in front of it is a convenience, not a gate. So identity
 * comes from the session on this side, never from the argument list.
 *
 * Note what is *not* checked here: whether this activity is yours. It doesn't
 * need to be, and checking would suggest the safety lives in this file. The row
 * is written with your own user_id, and `day_activities` references
 * `(activity_id, user_id)` as a pair — so an id belonging to someone else has
 * no matching row to point at and Postgres rejects the insert. See the
 * composite foreign keys in the Step 4 schema.
 */
async function signedInClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user };
}

/**
 * One `day_activities` row, cut down to what ordering needs.
 *
 * `activity_id` rides along with `id` because a renumber is written as an
 * upsert, and an upsert is an insert first — every not-null column without a
 * default has to be in the payload, even on rows that only want a new position.
 */
type Placement = { id: string; day: DayString; activity_id: string };

/** A slot number from a pointer, made safe for `splice`. */
function clamp(index: number, length: number) {
  return Math.max(0, Math.min(index, length));
}

/**
 * Write a day's order back as dense positions, 0 upwards.
 *
 * One statement for the whole day rather than an update per row — a day holds a
 * handful of marks, and a single upsert means the order can't end up half
 * applied if the connection drops in the middle. `onConflict` is left to the
 * primary key on purpose: these rows all exist, and a cross-day move is exactly
 * the case where matching on `(user_id, day, activity_id)` would insert a
 * second row instead of updating the one that moved.
 *
 * `.select("id")` for the reason `moveActivity` already documented: RLS filters
 * an UPDATE rather than rejecting it, so a payload that touched nothing at all
 * comes back as success. Counting the rows is the only tell.
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

/** A day's marks in the order they're drawn, which is the order they're numbered. */
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
 * Put an activity sticker on a day, in a chosen slot.
 *
 * Read the day, then write the whole day back. The tempting shortcut is one
 * insert with `position = index`, but positions have to stay dense and unique
 * per day for the next index to mean anything, so every mark from `index`
 * onwards needs a new number too. Since they're all being written anyway, the
 * new row rides along in the same upsert — insert and renumber as one
 * statement, not two that can half-happen.
 *
 * The duplicate branch stays a no-op, as `ignoreDuplicates` used to make it:
 * `unique (user_id, day, activity_id)` means the same sticker twice on one
 * Tuesday is impossible, and a second drop should be forgiving rather than an
 * error the UI has to explain. It's checked from the read now instead of being
 * left to the conflict — and if a racing tab beats us to it, `onConflict` on
 * that same triple turns the collision into a position update rather than a
 * failure, which is the same forgiving answer one layer down.
 */
export async function placeActivity(
  day: DayString,
  activityId: string,
  index: number,
): Promise<PlaceResult> {
  if (!DAY_PATTERN.test(day)) {
    return { ok: false, message: "That isn't a day." };
  }

  const { supabase, user } = await signedInClient();
  if (!user) return { ok: false, message: "You're signed out." };

  const existing = await readDay(supabase, [day]);
  if (existing === null) {
    return { ok: false, message: "That sticker didn't stick. Try again." };
  }
  if (existing.some((row) => row.activity_id === activityId)) return { ok: true };

  const order = existing.map((row) => row.activity_id);
  order.splice(clamp(index, order.length), 0, activityId);

  const { error } = await supabase.from("day_activities").upsert(
    order.map((id, position) => ({
      user_id: user.id,
      day,
      activity_id: id,
      position,
    })),
    { onConflict: "user_id,day,activity_id" },
  );

  if (error) {
    return { ok: false, message: "That sticker didn't stick. Try again." };
  }

  // The page has no Next.js cache entry to invalidate — it reads cookies and
  // queries Postgres on every request — so there is nothing to `revalidate`.
  // What's stale is the *rendered* tree the browser is holding. `refresh()`
  // re-runs this route on the server and ships the new RSC payload back in the
  // same response as this return value: one round trip, not two.
  refresh();
  return { ok: true };
}

/**
 * Take an activity sticker off a day.
 *
 * By `(day, activity_id)`, not by the `day_activities` row id. The modal is a
 * checkbox list built from the *library*, so what it knows is "Gym, on this
 * Tuesday" — the placement id would mean looking it up first, and the unique
 * constraint already guarantees the pair matches at most one row.
 *
 * No `.eq("user_id", …)`, for the same reason the queries in `lib/queries/`
 * don't carry one: the DELETE policy on `day_activities` is
 * `(select auth.uid()) = user_id`, so Postgres has already narrowed this to
 * rows that are yours. Repeating it here would suggest the safety lives in
 * this file — and if it did, forgetting it once would be a very bad day.
 *
 * It leaves a gap in the day's positions — 0, 2, 3 after taking the second mark
 * off — and that's fine on purpose. Only the *order* of the numbers is read;
 * their values never are. The next drop onto that day reads it, splices, and
 * writes the whole thing back dense, so the gap closes itself the moment it
 * would matter. Renumbering here would be a second round trip to fix nothing.
 */
export async function removeActivity(
  day: DayString,
  activityId: string,
): Promise<PlaceResult> {
  if (!DAY_PATTERN.test(day)) {
    return { ok: false, message: "That isn't a day." };
  }

  const { supabase, user } = await signedInClient();
  if (!user) return { ok: false, message: "You're signed out." };

  const { error } = await supabase
    .from("day_activities")
    .delete()
    .eq("day", day)
    .eq("activity_id", activityId);

  if (error) {
    return { ok: false, message: "That sticker wouldn't come off. Try again." };
  }

  refresh();
  return { ok: true };
}

/**
 * Carry a placement into a slot — on another day, or further along its own.
 *
 * Still one write, and still not a delete and an insert. The row already exists
 * and only its `day` and `position` are wrong, so updating it is both fewer
 * statements and — the part that shows on screen — identity-preserving: the
 * placement keeps its id, so React moves the circle rather than unmounting one
 * and mounting another.
 *
 * What's new is the read in front of it. A move now has to say *where* in the
 * day it lands, and a position is only meaningful next to the day's other
 * positions — so the days involved are read, spliced in memory, and written
 * back whole. That also turns the old `23505` fallback into an ordinary branch:
 * dragging Monday's Gym onto a Tuesday that already has Gym is spotted in the
 * read rather than discovered by a constraint, and the answer is the same merge
 * it always was — the mark leaves Monday and Tuesday keeps the one it had.
 *
 * `from === to` used to return early. It's the rearrange case now, and the only
 * thing that distinguishes it is which day gets rewritten: one, not two.
 *
 * The failure that doesn't look like one is unchanged, and it moved into
 * `writeOrder`: RLS *filters* an UPDATE rather than rejecting it, so a payload
 * that touched nothing at all comes back as success.
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

  const { supabase, user } = await signedInClient();
  if (!user) return { ok: false, message: "You're signed out." };

  const failed = { ok: false, message: "That sticker wouldn't move. Try again." } as const;

  const rows = await readDay(supabase, from === to ? [from] : [from, to]);
  if (rows === null) return failed;

  const source = rows.filter((row) => row.day === from);
  const was = source.findIndex((row) => row.activity_id === activityId);
  if (was === -1) return failed;

  const moving = source[was];
  const rest = source.filter((row) => row !== moving);

  if (from === to) {
    // The index was read against the day as it's drawn, dragged mark included,
    // so a slot to the right of where it started counts one position that's
    // about to stop existing. Same adjustment `applyChange` makes, for the same
    // reason — and it has to match, or the optimistic draw and the row that
    // comes back disagree by one.
    rest.splice(clamp(was < index ? index - 1 : index, rest.length), 0, moving);

    // Both carets touching a mark describe the slot it's already in, and
    // landing on one is how a drag gets abandoned — pick a mark up, think
    // better of it, put it back. `applyChange` returns the same Map for those
    // so the cell never repaints; this is the other half, so the round trip
    // doesn't happen either. Compared rather than special-cased, because the
    // clamp above can also collapse two different indexes onto one order.
    const unchanged = rest.every((row, at) => row.id === source[at].id);
    if (unchanged) return { ok: true };

    if (!(await writeOrder(supabase, user.id, [{ day: from, rows: rest }]))) {
      return failed;
    }
    refresh();
    return { ok: true };
  }

  const target = rows.filter((row) => row.day === to);

  // The merge: nowhere for the row to land, so the source loses its mark and
  // the target keeps the one it had. `removeActivity` refreshes for us; the
  // source still needs closing up behind the gap.
  if (target.some((row) => row.activity_id === activityId)) {
    const removed = await removeActivity(from, activityId);
    if (!removed.ok) return removed;
    await writeOrder(supabase, user.id, [{ day: from, rows: rest }]);
    refresh();
    return { ok: true };
  }

  target.splice(clamp(index, target.length), 0, moving);
  const written = await writeOrder(supabase, user.id, [
    { day: from, rows: rest },
    { day: to, rows: target },
  ]);
  if (!written) return failed;

  refresh();
  return { ok: true };
}

/**
 * Set the day's mood, replacing whatever was there.
 *
 * A true upsert this time, and the reason "mood replaces mood" needs no branch
 * in the UI: `unique (user_id, day)` gives Postgres a conflict target, so one
 * statement inserts or overwrites depending on what it finds. Read-then-decide-
 * then-write would be three round trips and a race between them.
 */
export async function setDayMood(
  day: DayString,
  mood: string,
): Promise<PlaceResult> {
  if (!DAY_PATTERN.test(day)) {
    return { ok: false, message: "That isn't a day." };
  }
  // The CHECK constraint would catch this too. Doing it here as well means the
  // failure is a sentence rather than a Postgres error string.
  if (!isMood(mood)) {
    return { ok: false, message: "That isn't a mood." };
  }

  const { supabase, user } = await signedInClient();
  if (!user) return { ok: false, message: "You're signed out." };

  const { error } = await supabase
    .from("day_moods")
    .upsert({ user_id: user.id, day, mood }, { onConflict: "user_id,day" });

  if (error) {
    return { ok: false, message: "That mood didn't save. Try again." };
  }

  refresh();
  return { ok: true };
}

/**
 * Take the mood off a day entirely.
 *
 * Not in ProjectPlan's description of the step, which asks for a five-way
 * picker and stops there. Added because "no mood" is a state the calendar can
 * already be in — most days are — and a picker that can reach every state but
 * that one means a mis-click is permanent. Deleting the row is what "none"
 * means here; there is no sixth mood, and adding one would have put a value in
 * the CHECK constraint that the grid would then have to know not to draw.
 */
export async function clearDayMood(day: DayString): Promise<PlaceResult> {
  if (!DAY_PATTERN.test(day)) {
    return { ok: false, message: "That isn't a day." };
  }

  const { supabase, user } = await signedInClient();
  if (!user) return { ok: false, message: "You're signed out." };

  const { error } = await supabase.from("day_moods").delete().eq("day", day);

  if (error) {
    return { ok: false, message: "That mood wouldn't clear. Try again." };
  }

  refresh();
  return { ok: true };
}

/**
 * Write the day's note, or clear it.
 *
 * An empty string deletes the row rather than storing `''`. The column is
 * `not null` and the calendar draws "no note" one way, so two representations
 * of the same nothing would only ever disagree — see `scripts/day-notes.sql`.
 *
 * Trimmed before the length check and before the emptiness test, so a note of
 * three spaces clears the day and a note that only exceeds 280 characters in
 * trailing whitespace is accepted rather than rejected for being too long.
 *
 * The optimistic write has already landed by the time this runs, and the week
 * strip will keep showing what you typed even if this fails — the error line
 * under the tray is what says otherwise. That is the same bargain every other
 * action here makes; the difference is that a note is the one thing you can
 * lose that you cannot reconstruct by looking at the screen, which is why the
 * message names the note rather than saying "try again".
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

  const { supabase, user } = await signedInClient();
  if (!user) return { ok: false, message: "You're signed out." };

  const { error } = text
    ? await supabase
        .from("day_notes")
        .upsert(
          { user_id: user.id, day, note: text },
          { onConflict: "user_id,day" },
        )
    : await supabase.from("day_notes").delete().eq("day", day);

  if (error) {
    return { ok: false, message: "That note didn't save. Copy it somewhere and try again." };
  }

  refresh();
  return { ok: true };
}
