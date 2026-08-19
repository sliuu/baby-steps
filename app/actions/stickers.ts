"use server";

import { refresh } from "next/cache";

import type { DayString } from "@/lib/dates";
import { isMood } from "@/lib/moods";
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
 * Put an activity sticker on a day.
 *
 * `upsert` with `ignoreDuplicates`, not `insert`. `unique (user_id, day,
 * activity_id)` means the same sticker twice on one Tuesday is already
 * impossible; the only question is what happens when you try. Ignoring the
 * conflict makes a second drop a no-op instead of an error the UI has to
 * explain, so the drag stays forgiving — which is the whole point of a drag.
 */
export async function placeActivity(
  day: DayString,
  activityId: string,
): Promise<PlaceResult> {
  if (!DAY_PATTERN.test(day)) {
    return { ok: false, message: "That isn't a day." };
  }

  const { supabase, user } = await signedInClient();
  if (!user) return { ok: false, message: "You're signed out." };

  const { error } = await supabase.from("day_activities").upsert(
    { user_id: user.id, day, activity_id: activityId },
    { onConflict: "user_id,day,activity_id", ignoreDuplicates: true },
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
