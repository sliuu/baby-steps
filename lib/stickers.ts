import type { DayString } from "@/lib/dates";
import type { Mood } from "@/lib/moods";

/**
 * Everything needed to *draw* a sticker, and nothing else.
 *
 * Two different rows in the database end up as a circle on screen: an activity
 * you own (in the tray) and a placement of one on a day (on the grid). They
 * carry different ids and mean different things, but they look identical, so
 * StickerMark asks for this and neither the tray nor the grid needs its own
 * version of the component.
 */
export type StickerFace = {
  name: string;
  /** One grapheme — a letter or an emoji. */
  mark: string;
  colorKey: string;
};

export type ActivitySticker = StickerFace & {
  /**
   * The day_activities row — this placement, not the activity itself. The same
   * activity on two days is two ActivityStickers with two ids.
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
 * A day with nothing on it.
 *
 * One shared value rather than a fresh `{ activities: [], mood: null }` per
 * lookup, so an empty day's props stay referentially equal between renders and
 * React can skip re-rendering it. Both the grid and the modal need the same
 * answer to "what's on a day the Map has never heard of".
 *
 * It lives here rather than beside `getStickersByDay` for a reason worth
 * keeping: this is a *value*, and a value import is real code that gets bundled
 * wherever it's imported. `lib/queries/stickers.ts` reaches for `next/headers`
 * two imports down, so pulling a constant out of it drags the Supabase server
 * client into the browser bundle and the build fails. Types are erased and
 * cross that line freely; values don't. So the shapes and the empty case live
 * on this side, and `lib/queries/` stays server-only.
 */
export const NO_STICKERS: DayStickers = { activities: [], mood: null };
