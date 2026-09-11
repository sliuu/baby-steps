import type { DayString } from "@/lib/dates";
import type { Mood } from "@/lib/moods";
// The one value import in this file, and it is relative with the extension on
// purpose. `lib/stickers.test.ts` loads this module in `node --test`, where
// nothing resolves `@/` — that alias belongs to the bundler, and there is no
// bundler in that process. Type imports are erased and can keep using it.
import { graphemeCount } from "./graphemes.ts";
// Same rule, same reason: relative, with the extension, so `node --test` can
// load this module without a bundler. It reaches `lucide-react` through that
// file, which is plain JavaScript and resolves fine in a bare node process.
import { isIconMark } from "./icons.ts";

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
  /**
   * What goes in the circle. One of two things, and `StickerMark` is the only
   * place that tells them apart: an icon name — `icon:dumbbell`, resolved
   * through `lib/icons.ts` — or a single grapheme.
   *
   * The picker only offers icons now; the emoji tabs are gone, and why is in
   * `lib/icons.ts`. The grapheme case did not go with them, because it is two
   * things rather than one: a typed letter, which is still a perfectly good
   * mark, and the emoji already sitting in somebody's database. Rejecting them
   * here would break rows that were valid when they were written, for no gain
   * — nothing can add a *new* emoji, which was the actual problem.
   *
   * Not two columns and not a tagged union, because the database has one
   * `mark text` column with a year of rows in it and every one of those rows is
   * still valid. The prefix is what makes one string able to say both things
   * without ambiguity; see `ICON_PREFIX`.
   */
  mark: string;
  colorKey: string;
};

/**
 * Just the three fields that draw a sticker, copied off something wider.
 *
 * Both things that can be dragged — a tray row and a placed mark — hold an id
 * as well as a face, and both used to hand their whole selves to the drag
 * payload as its `face`. That typechecks, because `StickerFace` is a subset of
 * both and TypeScript only excess-property-checks fresh object literals. It is
 * still wrong: the payload then carries an id that nothing reads and that any
 * `{...face}` downstream can silently overwrite a real one with. See the note
 * in `applyChange`, where exactly that cost a day's debugging.
 */
export function faceOf(sticker: StickerFace): StickerFace {
  return { name: sticker.name, mark: sticker.mark, colorKey: sticker.colorKey };
}

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
  /**
   * The day's note, or null when there isn't one.
   *
   * Null and not `""`. The database deletes the row rather than storing an
   * empty string, so there is one representation of "no note" on both sides of
   * the wire — and a day you typed into and then cleared is indistinguishable
   * from a day you never touched, which is the correct answer to a question
   * nobody asked.
   *
   * The month grid ignores it. Only the week strip is wide enough to give a
   * sentence a home, so this rides along in the same map rather than being
   * fetched by the view that happens to show it — one query, one shape, and
   * switching Month to Week is a re-render rather than a round trip.
   */
  note: string | null;
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
export const NO_STICKERS: DayStickers = {
  activities: [],
  mood: null,
  note: null,
};

/**
 * A sticker that doesn't exist yet: what the new-sticker form collects.
 *
 * Three strings, because that is what an HTML form has. It becomes an
 * `activities` row only if `validateDraft` says so, and only the server writes
 * it.
 */
export type StickerDraft = {
  name: string;
  mark: string;
  lifeAreaId: string;
};

/** Which field a complaint belongs to, so the form can point at it. */
export type DraftField = "name" | "mark" | "lifeArea";

export type DraftCheck =
  /** `draft` is the cleaned-up version — trimmed. Write *this*, not the input. */
  | { ok: true; draft: StickerDraft }
  | { ok: false; field: DraftField; message: string };

/**
 * Long enough for "Romance & Adventure"-sized habits, short enough that the
 * tray never has to truncate a name it could have shown. In *graphemes*: a
 * limit measured in code units would tell someone their five-emoji name is
 * fifteen characters long.
 */
export const NAME_MAX = 24;

/**
 * How long a day's note may be, matching the CHECK constraint in
 * `scripts/day-notes.sql` — if the two ever disagree, the database wins.
 *
 * "Short notes or summaries" is the brief, and 280 is what makes that true of
 * the data rather than only of the textarea: two or three sentences, and no
 * room to start keeping a journal in a calendar column.
 */
export const NOTE_MAX = 280;

/** Pull a draft out of a form. Anything missing is "", never null. */
export function readDraft(form: FormData): StickerDraft {
  return {
    name: readField(form, "name"),
    mark: readField(form, "mark"),
    lifeAreaId: readField(form, "lifeArea"),
  };
}

function readField(form: FormData, key: string): string {
  const value = form.get(key);
  // A FormData entry is a string *or a File*, and a POST anyone can craft can
  // send either. Anything that isn't a string is treated as absent rather than
  // stringified into "[object File]".
  return typeof value === "string" ? value : "";
}

/**
 * The one rule about what a sticker may be, in the one place both sides read.
 *
 * Both sides call this: the browser before it sends anything, so a mistake
 * costs no round trip and the message appears instantly; and the Server Action
 * before it writes, because the browser is a convenience and the POST endpoint
 * behind it is reachable without one. Because it is literally the same
 * function, the two checks cannot drift and the sentence the user reads is the
 * same sentence either way — the Step 9 argument for `CalendarChange`, applied
 * to validation instead of to changes.
 *
 * Below it sits a third layer that this function can't reproduce: `NOT NULL`,
 * the composite foreign key, and `unique (user_id, life_area_id, name)` in the
 * database. Those are the ones that hold when two tabs submit at once. What
 * *can't* live down there is the "one character" rule — SQL's `length()`
 * counts code points and would call a single emoji two or three characters —
 * which is exactly why this function is unit-tested and the constraints aren't.
 */
export function validateDraft(draft: StickerDraft): DraftCheck {
  const name = draft.name.trim();
  const mark = draft.mark.trim();
  const lifeAreaId = draft.lifeAreaId.trim();

  if (!name) {
    return { ok: false, field: "name", message: "Give your sticker a name." };
  }
  if (graphemeCount(name) > NAME_MAX) {
    return {
      ok: false,
      field: "name",
      message: `That name is too long — ${NAME_MAX} characters at most.`,
    };
  }

  if (!mark) {
    return {
      ok: false,
      field: "mark",
      message: "Pick an icon, or type a letter.",
    };
  }
  // An icon name is checked against the set rather than against a pattern, so
  // an id that has been retired from `lib/icons.ts` can't be saved as one. The
  // grapheme rule is unchanged and still second, which is the order that
  // matters: `icon:dumbbell` is thirteen graphemes and would fail it.
  if (!isIconMark(mark) && graphemeCount(mark) !== 1) {
    return {
      ok: false,
      field: "mark",
      message: "Pick an icon, or type a single character.",
    };
  }

  if (!lifeAreaId) {
    return {
      ok: false,
      field: "lifeArea",
      message: "Choose a life area.",
    };
  }

  return { ok: true, draft: { name, mark, lifeAreaId } };
}
