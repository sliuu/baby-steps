import type { DayString } from "@/lib/dates";
import { isMood, type Mood } from "@/lib/moods";
import type { StickerFace } from "@/lib/stickers";
import { createClient } from "@/lib/supabase/server";

export type ActivitySticker = StickerFace & {
  /**
   * The day_activities row — this placement, not the activity itself. The same
   * activity on two days is two ActivityStickers with two ids. Step 9 removes a
   * sticker by this id.
   */
  id: string;
  /**
   * The activities row — the sticker itself. Carried alongside the placement id
   * because a drop needs to ask "is this one already here?", and `id` can't
   * answer that: two placements of the same activity have different ids by
   * definition. Without this the optimistic redraw adds a duplicate circle and
   * the server's answer takes it away again a moment later.
   */
  activityId: string;
};

/**
 * Everything on one day. Activities are a list; the mood is one value or none.
 *
 * That asymmetry is not a rendering convenience — it's `unique (user_id, day)`
 * on day_moods, written into the type. A `Mood[]` would leave every reader
 * deciding what two moods on a Tuesday means, for a state the database will
 * never produce.
 */
export type DayStickers = {
  activities: ActivitySticker[];
  mood: Mood | null;
};

export type StickersByDay = Map<DayString, DayStickers>;

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
 */
export async function getStickersByDay(): Promise<StickersByDay> {
  const supabase = await createClient();

  // Both requests leave together. Awaiting them one after the other would make
  // the page wait for the sum rather than the slower of the two.
  const [placed, moods] = await Promise.all([
    supabase
      .from("day_activities")
      .select("id, day, activities(id, name, mark, life_areas(color_key))")
      .order("created_at"),
    supabase.from("day_moods").select("id, day, mood"),
  ]);

  if (placed.error) {
    throw new Error(`Could not load placed stickers: ${placed.error.message}`);
  }
  if (moods.error) {
    throw new Error(`Could not load moods: ${moods.error.message}`);
  }

  const byDay: StickersByDay = new Map();

  function dayEntry(day: DayString): DayStickers {
    let entry = byDay.get(day);
    if (!entry) {
      entry = { activities: [], mood: null };
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

  return byDay;
}
