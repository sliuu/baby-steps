import { cache } from "react";

import { fromDbColorKey } from "@/lib/palette";
import type { StickerFace } from "@/lib/stickers";
import { createClient } from "@/lib/supabase/server";
import { queryFailure, whileTokenSettles } from "./settling";

export type LibrarySticker = StickerFace & {
  /** The activities row — the sticker itself, not any placement of it. */
  id: string;
  /**
   * Retired: still yours, still counted, no longer offered.
   *
   * Every consumer of this list has to decide what it means for them, and they
   * don't all answer the same way — which is exactly why the flag rides along
   * on the sticker instead of the query filtering it out. See the note on
   * `getStickerLibrary`.
   */
  archived: boolean;
};

export type LibraryGroup = {
  categoryId: string;
  categoryName: string;
  /** Seeded slug ("exercise", …); keys the suggestions. Optional for fixtures. */
  slug?: string;
  /**
   * The category's own ramp. Every sticker below already carries a copy of it —
   * that's how a sticker gets its colour — but the group needs it in its own
   * right now: the new-sticker form offers the six categories as a dropdown, and an
   * category with nothing in it yet has no sticker to borrow a colour from.
   */
  colorKey: string;
  stickers: LibrarySticker[];
};

/**
 * Every sticker the user can place, grouped by category, in display order.
 *
 * Queried from life_areas *downward* rather than from activities upward, which
 * is the difference between one query and two. `activities(...)` here is the
 * same join as in stickers.ts pointed the other way: one category, many activities,
 * so it comes back as an array — and a category with none comes back with an empty
 * one instead of disappearing. That matters. Six labelled groups is what tells
 * you the six categories exist before you've made a single sticker.
 *
 * Archived stickers come back too, carrying the flag, and this used to be a
 * `.eq("activities.archived", false)` on the embed that dropped them. Filtering
 * here was hiding them from four callers that wanted four different answers:
 *
 * - `tally` has to see them, or archiving a sticker would quietly subtract its
 *   whole history from its category's count. Archiving tidies the tray; it
 *   doesn't unhappen the mornings you went.
 * - `buildHighlight` has to see them, or lighting up a category would skip the
 *   days it was the retired sticker that you placed.
 * - `StickerTray` doesn't want them among the draggable rows, and does want
 *   them in the "Archived" section at the bottom.
 * - The day panel shows them only on days they're already on.
 *
 * Four questions, one row, so the row carries the fact and each caller answers
 * for itself. The rule this is an instance of: a query filters on what is
 * *true*, not on what any one screen wants to show.
 *
 * `cache` because two callers ask for this on every page load — both tabs are
 * rendered on the server even though one of them is off screen — and Step 17
 * put each behind its own Suspense boundary, which is what made the second call
 * visible. `cache` memoizes for the life of one request: the two views share a
 * single promise, and the second caller awaits the first one's answer instead
 * of opening its own round trip. It lasts exactly one request, so a Server
 * Action that writes and revalidates still gets fresh rows.
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
      // Ordering inside the embed needs saying so explicitly — without
      // referencedTable this would try to sort life_areas by created_at.
      .order("created_at", { referencedTable: "activities" }),
  );

  if (error || !data) {
    // The client only receives a digest for a Server Component error. Keep the
    // structured PostgREST fields in the server log so a transient auth error,
    // a missing relation and a network failure are distinguishable there.
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
        // A sticker takes its category's colour.
        colorKey,
      })),
    };
  });
});
