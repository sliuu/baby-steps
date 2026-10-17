import { cache } from "react";

import type { DayString } from "@/lib/dates";
import { isMood } from "@/lib/moods";
import type { DayStickers, StickersByDay } from "@/lib/stickers";
import { createClient } from "@/lib/supabase/server";
import { getStickerLibrary } from "./activities";
import { readAllPages } from "./paginate";
import { queryFailure, whileTokenSettles } from "./settling";

// Shapes live in `lib/stickers.ts`; this module is server-only (`next/headers`).

/**
 * All the user's stickers, keyed by day (Map: 42 cell lookups). Fetches all
 * history, not one month; revisit near five figures. RLS scopes rows.
 * `cache`d: both tabs want it per request.
 */
export const getStickersByDay = cache(async function getStickersByDay(): Promise<StickersByDay> {
  const supabase = await createClient();

  // Paged explicitly: PostgREST caps responses at 1,000 rows.
  const [groups, placed, moods, notes] = await Promise.all([
    getStickerLibrary(),
    readAllPages((from, to) =>
      whileTokenSettles(() =>
        supabase
          .from("day_activities")
          .select("id, day, activity_id")
          // Total order, or tied rows shift between pages.
          .order("day")
          .order("position")
          .order("created_at")
          .order("id")
          .range(from, to),
      ),
    ),
    readAllPages((from, to) =>
      whileTokenSettles(() =>
        supabase
          .from("day_moods")
          .select("id, day, mood")
          .order("day")
          .order("id")
          .range(from, to),
      ),
    ),
    readAllPages((from, to) =>
      whileTokenSettles(() =>
        supabase
          .from("day_notes")
          .select("id, day, note")
          .order("day")
          .order("id")
          .range(from, to),
      ),
    ),
  ]);

  if (placed.error || !placed.data) {
    console.error("Placed stickers query failed", {
      message: placed.error?.message ?? "no rows returned",
      code: placed.error?.code,
      details: placed.error?.details,
      hint: placed.error?.hint,
    });
    throw queryFailure("Could not load placed stickers", placed.error);
  }
  if (moods.error || !moods.data) {
    console.error("Moods query failed", {
      message: moods.error?.message ?? "no rows returned",
      code: moods.error?.code,
      details: moods.error?.details,
      hint: moods.error?.hint,
    });
    throw queryFailure("Could not load moods", moods.error);
  }
  // Missing `day_notes` table lands here: run `npm run db:notes`.
  if (notes.error || !notes.data) {
    console.error("Day notes query failed", {
      message: notes.error?.message ?? "no rows returned",
      code: notes.error?.code,
      details: notes.error?.details,
      hint: notes.error?.hint,
    });
    throw queryFailure("Could not load notes", notes.error);
  }

  const byDay: StickersByDay = new Map();
  const faces = new Map(
    groups.flatMap((group) =>
      group.stickers.map((sticker) => [sticker.id, sticker] as const),
    ),
  );

  function dayEntry(day: DayString): DayStickers {
    let entry = byDay.get(day);
    if (!entry) {
      entry = { activities: [], mood: null, note: null };
      byDay.set(day, entry);
    }
    return entry;
  }

  for (const row of placed.data) {
    const activity = faces.get(row.activity_id);
    // Skip orphans rather than crash.
    if (!activity) continue;

    dayEntry(row.day).activities.push({
      id: row.id,
      activityId: row.activity_id,
      name: activity.name,
      mark: activity.mark,
      colorKey: activity.colorKey,
    });
  }

  for (const row of moods.data) {
    // CHECK lives in Postgres; narrow the string to Mood.
    if (!isMood(row.mood)) continue;
    dayEntry(row.day).mood = row.mood;
  }

  // Column is not null with a length CHECK; no narrowing needed.
  for (const row of notes.data) {
    dayEntry(row.day).note = row.note;
  }

  return byDay;
});
