import type { LibraryGroup } from "@/lib/queries/activities";
import type { DayStickers } from "@/lib/stickers";
// Relative imports with extensions, for `node --test`.
import { MOOD_LABEL, type Mood } from "./moods.ts";

/** The tray selection: identity only, derived via `buildHighlight`. Not persisted. */
export type Selection =
  | { kind: "activity"; activityId: string }
  | { kind: "category"; categoryId: string }
  | { kind: "mood"; mood: Mood };

/** By value, since every click builds a fresh object. Equal means clicking clears. */
export function sameSelection(
  a: Selection | null,
  b: Selection | null,
): boolean {
  if (!a || !b || a.kind !== b.kind) return false;
  if (a.kind === "activity" && b.kind === "activity")
    return a.activityId === b.activityId;
  if (a.kind === "category" && b.kind === "category") return a.categoryId === b.categoryId;
  if (a.kind === "mood" && b.kind === "mood") return a.mood === b.mood;
  return false;
}

/** A selection resolved once; category and sticker both become a set of activity ids. */
export type Highlight = {
  /** Any mark not in here recedes. */
  activityIds: ReadonlySet<string>;
  /** Mood selections only. */
  mood: Mood | null;
  /** Null for ink: moods have no colour in this app. */
  colorKey: string | null;
  label: string;
};

const NO_IDS: ReadonlySet<string> = new Set();

/** Null when the selection names something gone (client vs server can disagree). */
export function buildHighlight(
  selection: Selection,
  groups: LibraryGroup[],
): Highlight | null {
  if (selection.kind === "mood") {
    return {
      activityIds: NO_IDS,
      mood: selection.mood,
      colorKey: null,
      label: MOOD_LABEL[selection.mood],
    };
  }

  if (selection.kind === "category") {
    const group = groups.find((g) => g.categoryId === selection.categoryId);
    if (!group) return null;
    return {
      activityIds: new Set(group.stickers.map((sticker) => sticker.id)),
      mood: null,
      colorKey: group.colorKey,
      label: group.categoryName,
    };
  }

  for (const group of groups) {
    const sticker = group.stickers.find(
      (candidate) => candidate.id === selection.activityId,
    );
    if (sticker) {
      return {
        activityIds: new Set([sticker.id]),
        mood: null,
        colorKey: sticker.colorKey,
        label: sticker.name,
      };
    }
  }
  return null;
}

/** Matches on `activityId`, never `id` (a per-day placement). */
export function dayMatches(
  highlight: Highlight,
  stickers: DayStickers,
): boolean {
  if (highlight.mood) return stickers.mood === highlight.mood;
  return stickers.activities.some((sticker) =>
    highlight.activityIds.has(sticker.activityId),
  );
}
