import type { DayString } from "@/lib/dates";
import type { Mood } from "@/lib/moods";
// Relative with extension: `node --test` has no bundler to resolve `@/`.
import { graphemeCount } from "./graphemes.ts";
// Same: relative, with extension.
import { isIconMark } from "./icons.ts";

/** What it takes to draw a sticker; shared by tray activities and placements. */
export type StickerFace = {
  name: string;
  /** `icon:<name>` (see `ICON_PREFIX`) or one grapheme; legacy emoji stay valid. */
  mark: string;
  colorKey: string;
};

/** Copy just the face. Spreading a wider object leaks an `id` (see `applyChange`). */
export function faceOf(sticker: StickerFace): StickerFace {
  return { name: sticker.name, mark: sticker.mark, colorKey: sticker.colorKey };
}

export type ActivitySticker = StickerFace & {
  /** The day_activities row (this placement). */
  id: string;
  /** The activities row; lets a drop detect duplicates. */
  activityId: string;
};

/** One day. A single mood: `unique (user_id, day)` on day_moods. */
export type DayStickers = {
  activities: ActivitySticker[];
  mood: Mood | null;
  /** Null, never "": an empty note deletes the row. */
  note: string | null;
};

export type StickersByDay = Map<DayString, DayStickers>;

/**
 * Shared empty day, so props stay referentially equal. Lives here because
 * `lib/queries/` is server-only and a value import would bundle it.
 */
export const NO_STICKERS: DayStickers = {
  activities: [],
  mood: null,
  note: null,
};

/** The new-sticker form's fields; only the server writes it. */
export type StickerDraft = {
  name: string;
  mark: string;
  categoryId: string;
};

export type DraftField = "name" | "mark" | "category";

export type DraftCheck =
  /** Trimmed; write this, not the input. */
  | { ok: true; draft: StickerDraft }
  | { ok: false; field: DraftField; message: string };

/** In graphemes, not code units. */
export const NAME_MAX = 24;

/** Must match the CHECK in `scripts/day-notes.sql`; the database wins. */
export const NOTE_MAX = 280;

/** Missing fields are "", never null. */
export function readDraft(form: FormData): StickerDraft {
  return {
    name: readField(form, "name"),
    mark: readField(form, "mark"),
    categoryId: readField(form, "category"),
  };
}

function readField(form: FormData, key: string): string {
  const value = form.get(key);
  // FormData may hold a File; treat non-strings as absent.
  return typeof value === "string" ? value : "";
}

/**
 * Shared by browser and Server Action so the checks can't drift. The DB holds
 * NOT NULL/FK/unique; the one-grapheme rule can't live in SQL (`length()`
 * counts code points).
 */
export function validateDraft(draft: StickerDraft): DraftCheck {
  const name = draft.name.trim();
  const mark = draft.mark.trim();
  const categoryId = draft.categoryId.trim();

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
  // Icons checked against the set (retired ids fail), before the grapheme rule.
  if (!isIconMark(mark) && graphemeCount(mark) !== 1) {
    return {
      ok: false,
      field: "mark",
      message: "Pick an icon, or type a single character.",
    };
  }

  if (!categoryId) {
    return {
      ok: false,
      field: "category",
      message: "Choose a category.",
    };
  }

  return { ok: true, draft: { name, mark, categoryId } };
}
