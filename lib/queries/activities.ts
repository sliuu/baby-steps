import { cache } from "react";

import type { StickerFace } from "@/lib/stickers";
import { createClient } from "@/lib/supabase/server";
import { whileTokenSettles } from "./settling";

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
  areaId: string;
  areaName: string;
  /**
   * The area's own ramp. Every sticker below already carries a copy of it —
   * that's how a sticker gets its colour — but the group needs it in its own
   * right now: the new-sticker form offers the six areas as a dropdown, and an
   * area with nothing in it yet has no sticker to borrow a colour from.
   */
  colorKey: string;
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
 * Archived stickers come back too, carrying the flag, and this used to be a
 * `.eq("activities.archived", false)` on the embed that dropped them. Filtering
 * here was hiding them from four callers that wanted four different answers:
 *
 * - `tally` has to see them, or archiving a sticker would quietly subtract its
 *   whole history from its life area's count. Archiving tidies the tray; it
 *   doesn't unhappen the mornings you went.
 * - `buildHighlight` has to see them, or lighting up a life area would skip the
 *   days it was the retired sticker that you placed.
 * - `StickerTray` doesn't want them among the draggable rows, and does want
 *   them in the "Archived" section at the bottom.
 * - `DayModal` wants them only on days they're already on, so you can take one
 *   off without being able to put a new one on.
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
      .from("life_areas")
      .select(
        "id, name, color_key, sort_order, activities(id, name, mark, archived)",
      )
      .order("sort_order")
      // Ordering inside the embed needs saying so explicitly — without
      // referencedTable this would try to sort life_areas by created_at.
      .order("created_at", { referencedTable: "activities" }),
  );

  if (error || !data) {
    throw new Error(
      `Could not load your stickers: ${error?.message ?? "no rows returned"}`,
    );
  }

  return data.map((area) => ({
    areaId: area.id,
    areaName: area.name,
    colorKey: area.color_key,
    stickers: area.activities.map((activity) => ({
      id: activity.id,
      name: activity.name,
      mark: activity.mark,
      archived: activity.archived,
      // A sticker takes its colour from its area — the tray is the only place
      // that's obvious, because the group label is right above it.
      colorKey: area.color_key,
    })),
  }));
});
