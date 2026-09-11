import { cache } from "react";

import type { DayString } from "@/lib/dates";
import { isMood } from "@/lib/moods";
import type { DayStickers, StickersByDay } from "@/lib/stickers";
import { createClient } from "@/lib/supabase/server";
import { whileTokenSettles } from "./settling";

// The shapes this returns live in `lib/stickers.ts`, not here. This module
// reaches `next/headers` through the Supabase server client, so anything
// exported from it that isn't a type cannot be imported by a Client Component.
// Keeping it down to the one async function is what makes that rule easy.

/**
 * Every sticker the signed-in user has placed, keyed by day.
 *
 * A Map rather than an array because of how it gets read: the grid renders 42
 * cells and each one asks "what's on this day?". Against an array that's 42
 * passes over every row you own. Against a Map it's 42 instant lookups, and the
 * cost of building it is one pass.
 *
 * All of it, not one month. A few years of daily use is a few thousand rows —
 * smaller than the JavaScript on this page — and fetching the lot means arrowing
 * to another month needs no round trip at all. Revisit if it ever reaches five
 * figures; the fix is a date range on both queries, and nothing above here
 * changes.
 *
 * No .eq("user_id", …) in either query. See lib/queries/lifeAreas.ts.
 *
 * `cache` for the same reason `getStickerLibrary` has it: both tabs render on
 * every request and both want this map, so without it the page opens four
 * queries where two would do. See that function for the full note.
 */
export const getStickersByDay = cache(async function getStickersByDay(): Promise<StickersByDay> {
  const supabase = await createClient();

  // Both requests leave together. Awaiting them one after the other would make
  // the page wait for the sum rather than the slower of the two.
  const [placed, moods, notes] = await Promise.all([
    whileTokenSettles(() =>
      supabase
        .from("day_activities")
        .select("id, day, activities(id, name, mark, life_areas(color_key))")
        // `position` first, `created_at` as the tiebreak. Two orderings rather
        // than one because `position` carries no unique constraint — see the
        // migration for why a swap can't have one — so equal values are
        // possible and the sort has to stay total. Without a second key
        // Postgres is free to return ties in any order it likes, and a day
        // would quietly reshuffle itself between page loads.
        .order("position")
        .order("created_at"),
    ),
    whileTokenSettles(() =>
      supabase.from("day_moods").select("id, day, mood"),
    ),
    whileTokenSettles(() =>
      supabase.from("day_notes").select("id, day, note"),
    ),
  ]);

  if (placed.error || !placed.data) {
    throw new Error(
      `Could not load placed stickers: ${placed.error?.message ?? "no rows returned"}`,
    );
  }
  if (moods.error || !moods.data) {
    throw new Error(
      `Could not load moods: ${moods.error?.message ?? "no rows returned"}`,
    );
  }
  // A missing `day_notes` relation lands here, not as an empty list — which is
  // exactly what you see if `npm run db:notes` hasn't been run yet.
  if (notes.error || !notes.data) {
    throw new Error(
      `Could not load notes: ${notes.error?.message ?? "no rows returned"}`,
    );
  }

  const byDay: StickersByDay = new Map();

  function dayEntry(day: DayString): DayStickers {
    let entry = byDay.get(day);
    if (!entry) {
      entry = { activities: [], mood: null, note: null };
      byDay.set(day, entry);
    }
    return entry;
  }

  for (const row of placed.data) {
    const activity = row.activities;
    // A row whose activity vanished shouldn't take the page down with it.
    if (!activity) continue;

    dayEntry(row.day).activities.push({
      id: row.id,
      activityId: activity.id,
      name: activity.name,
      mark: activity.mark,
      colorKey: activity.life_areas?.color_key ?? "blue",
    });
  }

  for (const row of moods.data) {
    // `mood` is a plain string here, and the CHECK constraint lives in Postgres
    // rather than in this file's types. Narrowing it is what turns it into Mood.
    if (!isMood(row.mood)) continue;
    dayEntry(row.day).mood = row.mood;
  }

  // No narrowing to do — the column is `not null` with a length CHECK, so any
  // row that exists holds a note worth showing. An empty note is the absence of
  // a row, which is why there is nothing to skip here.
  for (const row of notes.data) {
    dayEntry(row.day).note = row.note;
  }

  return byDay;
});
