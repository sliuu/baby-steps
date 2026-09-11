import type { DropTarget } from "@/components/dnd/dropTarget";
import type { CalendarChange } from "@/lib/changes";
import type { DayString } from "@/lib/dates";
import type { Highlight } from "@/lib/highlight";
import type { StickersByDay } from "@/lib/stickers";

/**
 * The vocabulary the month grid and the week strip share.
 *
 * A file of types and nothing else, which is the point: these three names were
 * `MonthGrid`'s until there were two grids, and leaving them there would have
 * made the week strip import from the month it has nothing to do with. The
 * alternative — each grid declaring its own copy — is how the two views start
 * disagreeing about what a drop target is.
 */

/** Month grid or week strip. The calendar shows one of the two. */
export type CalendarViewMode = "month" | "week";

/**
 * The one mark that just arrived, if any.
 *
 * Keyed by activity rather than by sticker row id, because the id changes. A
 * placed sticker is optimistic first — it renders under `pending:…` while the
 * insert is in flight, then swaps to the real uuid when the server answers.
 * Watching the id would mean the mark is a different mark halfway through its
 * own landing animation, and the animation restarts. The activity is unique
 * within a day (the table's own constraint says so) and doesn't move.
 */
export type Landed = { day: DayString; activityId: string };

/**
 * Everything a grid is handed and passes straight through to its days.
 *
 * None of it is owned by a grid. It all belongs to `CalendarBoard`, because
 * every one of these is set by something outside the calendar — the tray sets
 * the highlight, the drag sets the target, a commit sets the landing — and the
 * grid is the thing they are set *on*.
 */
export type PeriodProps = {
  /**
   * Fetched once on the server, for every day at once. That's why arrowing to
   * September is instant and needs no request — the data for it is already
   * here, and so is the note at the bottom of every column.
   */
  stickersByDay: StickersByDay;
  /** The pencil in a day's corner. The grid itself owns no selection. */
  onOpenDay: (day: DayString) => void;
  /** Moods, notes, and the day modal's checkboxes. See `CalendarBoard.commit`. */
  onCommit: (change: CalendarChange) => void;
  /** The resolved tray selection, or null. */
  highlight: Highlight | null;
  /**
   * Where a release would land right now, or null between drags. One value
   * doing two jobs: the day it names gets the drop highlight, and the index it
   * names gets the caret.
   */
  target: DropTarget | null;
  /**
   * Whether that target should show a caret at all. False for a mood, which
   * lands on the day as a whole and has no slot to sit in — the day still
   * lights up, but no line appears between marks to promise an order that isn't
   * about to change.
   */
  caret: boolean;
  /** Set for roughly half a second after a mark is placed, then back to null. */
  landed: Landed | null;
  /** Today, or null on the server and during hydration. See `CalendarPanel`. */
  todayString: DayString | null;
};
