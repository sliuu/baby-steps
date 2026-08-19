import type { StickerFace } from "@/lib/stickers";
import { createClient } from "@/lib/supabase/server";

export type LibrarySticker = StickerFace & {
  /** The activities row — the sticker itself, not any placement of it. */
  id: string;
};

export type LibraryGroup = {
  areaId: string;
  areaName: string;
  stickers: LibrarySticker[];
};

/**
 * Every sticker the user can place, grouped by life area, in display order.
 *
 * Queried from life_areas *downward* rather than from activities upward, which
 * is the difference between one query and two. `activities(...)` here is the
 * same join as in stickers.ts pointed the other way: one area, many activities,
 * so it comes back as an array — and an area with none comes back with an empty
 * one instead of disappearing. That matters. Six labelled groups is what tells
 * you the six areas exist before you've made a single sticker.
 *
 * `.eq("activities.archived", false)` filters the *nested* rows, not the areas.
 * (Adding `!inner` to the embed is what would make it drop areas instead.)
 */
export async function getStickerLibrary(): Promise<LibraryGroup[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("life_areas")
    .select("id, name, color_key, sort_order, activities(id, name, mark)")
    .eq("activities.archived", false)
    .order("sort_order")
    // Ordering inside the embed needs saying so explicitly — without
    // referencedTable this would try to sort life_areas by created_at.
    .order("created_at", { referencedTable: "activities" });

  if (error) {
    throw new Error(`Could not load your stickers: ${error.message}`);
  }

  return data.map((area) => ({
    areaId: area.id,
    areaName: area.name,
    stickers: area.activities.map((activity) => ({
      id: activity.id,
      name: activity.name,
      mark: activity.mark,
      // A sticker takes its colour from its area — the tray is the only place
      // that's obvious, because the group label is right above it.
      colorKey: area.color_key,
    })),
  }));
}
