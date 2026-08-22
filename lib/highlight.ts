import type { LibraryGroup } from "@/lib/queries/activities";
import type { DayStickers } from "@/lib/stickers";
// Value imports are relative and carry the extension, for the reason spelled
// out in `lib/stickers.ts`: this module is loaded by `node --test`, where the
// `@/` alias means nothing. `lib/moods.ts` is safe to pull in that way because
// everything *it* imports is a type. The three imports above are erased.
import { MOOD_LABEL, type Mood } from "./moods.ts";

/**
 * What you clicked in the tray, and nothing more.
 *
 * Three kinds, one at a time, or null for "nothing selected". This is the whole
 * of the step's state — three fields at most, and it is deliberately identity
 * only: no colour, no name, no list of days. Everything visible is derived from
 * it by `buildHighlight`, so there is no second copy of anything to keep in
 * step, and a sticker renamed on the server changes the label with no code.
 *
 * It is also *not* saved anywhere. No database column, no URL, no
 * `localStorage`. A highlight is a way of looking at the month, not a fact
 * about it — reload the page and it's gone, which is correct.
 */
export type Selection =
  | { kind: "activity"; activityId: string }
  | { kind: "area"; areaId: string }
  | { kind: "mood"; mood: Mood };

/**
 * Whether two selections mean the same thing — which is what makes clicking a
 * lit row *clear* it rather than re-select it. Compared by value, because
 * every click builds a fresh object and `===` would always be false.
 */
export function sameSelection(
  a: Selection | null,
  b: Selection | null,
): boolean {
  if (!a || !b || a.kind !== b.kind) return false;
  if (a.kind === "activity" && b.kind === "activity")
    return a.activityId === b.activityId;
  if (a.kind === "area" && b.kind === "area") return a.areaId === b.areaId;
  if (a.kind === "mood" && b.kind === "mood") return a.mood === b.mood;
  return false;
}

/**
 * A selection resolved against the library: everything the calendar needs to
 * draw it, worked out once instead of 42 times.
 *
 * Note what collapses here. An area and a single sticker arrive as different
 * kinds and leave as the same shape — a set of activity ids — so nothing
 * downstream branches on which one you clicked. Selecting an area is just
 * selecting several stickers at once.
 */
export type Highlight = {
  /** The activity ids that *are* the selection. Any mark not in here recedes. */
  activityIds: ReadonlySet<string>;
  /** Set only for a mood selection; a day matches when its mood is this one. */
  mood: Mood | null;
  /**
   * The ramp to wash matching days in, or null for ink. Moods have no colour
   * anywhere in this app — `MoodMark` is deliberately a plain outline — so
   * lighting them in a ramp hue would invent a colour language they don't have.
   */
  colorKey: string | null;
  /** What to call it on screen: "Meditation", "Spirituality", "Rough". */
  label: string;
};

const NO_IDS: ReadonlySet<string> = new Set();

/**
 * Look a selection up in the library.
 *
 * Returns null when it names something that isn't there any more. That isn't
 * defensive padding: the selection is client state and the library is server
 * data, so the two can genuinely disagree for a moment — archive the sticker
 * you had selected, or have another tab do it, and this is the case. Null
 * means "nothing is lit", which is the honest answer.
 */
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

  if (selection.kind === "area") {
    const group = groups.find((g) => g.areaId === selection.areaId);
    if (!group) return null;
    return {
      activityIds: new Set(group.stickers.map((sticker) => sticker.id)),
      mood: null,
      colorKey: group.colorKey,
      label: group.areaName,
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

/**
 * Does this day get lit?
 *
 * Takes the day's stickers rather than the day string, because the caller has
 * already looked them up — the grid does exactly one Map lookup per cell and
 * this rides along on it.
 *
 * Activities match on `activityId`, never on `id`. `id` is one *placement* of a
 * sticker on one day, so it is different on every day it appears; matching on
 * it would light exactly nothing.
 */
export function dayMatches(
  highlight: Highlight,
  stickers: DayStickers,
): boolean {
  if (highlight.mood) return stickers.mood === highlight.mood;
  return stickers.activities.some((sticker) =>
    highlight.activityIds.has(sticker.activityId),
  );
}
