import { cache } from "react";

import { fromDbColorKey } from "@/lib/palette";
import type { StickerFace } from "@/lib/stickers";
import { createClient } from "@/lib/supabase/server";
import { queryFailure, whileTokenSettles } from "./settling";

export type LibrarySticker = StickerFace & {
  /** The activities row id, not a placement's. */
  id: string;
  /** Retired: still counted, not offered. Callers decide what it means. */
  archived: boolean;
};

export type LibraryGroup = {
  categoryId: string;
  categoryName: string;
  /** Seeded slug ("exercise", …); keys the suggestions. Optional for fixtures. */
  slug?: string;
  /** Needed by the form's dropdown: an empty category has no sticker to borrow from. */
  colorKey: string;
  stickers: LibrarySticker[];
};

/**
 * Every sticker by category, in display order. From life_areas down, so empty
 * categories still appear. Archived rows included: tally, highlight and tray
 * each treat them differently. `cache`: both views ask per request.
 */
export const getStickerLibrary = cache(async function getStickerLibrary(): Promise<
  LibraryGroup[]
> {
  const supabase = await createClient();

  const { data, error } = await whileTokenSettles(() =>
    supabase
      // The DB table keeps its old name; the app calls these categories.
      .from("life_areas")
      .select(
        "id, name, slug, color_key, sort_order, activities(id, name, mark, archived)",
      )
      .order("sort_order")
      // Needs referencedTable, or this sorts life_areas instead.
      .order("created_at", { referencedTable: "activities" }),
  );

  if (error || !data) {
    // The client only gets a digest; log PostgREST fields here.
    console.error("Sticker library query failed", {
      message: error?.message ?? "no rows returned",
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
    });
    throw queryFailure("Could not load your stickers", error);
  }

  return data.map((category) => {
    const colorKey = fromDbColorKey(category.color_key);
    return {
      categoryId: category.id,
      categoryName: category.name,
      slug: category.slug,
      colorKey,
      stickers: category.activities.map((activity) => ({
        id: activity.id,
        name: activity.name,
        mark: activity.mark,
        archived: activity.archived,
        colorKey,
      })),
    };
  });
});
