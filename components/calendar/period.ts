import type { DropTarget } from "@/components/dnd/dropTarget";
import type { CalendarChange } from "@/lib/changes";
import type { DayString } from "@/lib/dates";
import type { Highlight } from "@/lib/highlight";
import type { StickersByDay } from "@/lib/stickers";

/** Shared by the grids and Today. Same strings as `CalendarPage` in `lib/nav.ts`. */
export type CalendarViewMode = "month" | "week" | "today";

/** Mirrors `LANDING` in `lib/nav.ts` (calendar may not import nav). */
export const LANDING_VIEW: CalendarViewMode = "today";

/** Keyed by activity: the row id changes when the insert lands. */
/** `from`: where a tapped tray sticker's mark was, so it flies in from there. */
export type Landed = { day: DayString; activityId: string; from?: DOMRect };

/** After today. False until the browser knows which day today is. */
export function isFuture(day: DayString, todayString: DayString | null): boolean {
  return todayString !== null && day > todayString;
}

/** What a grid is handed; all of it owned above. */
export type PeriodProps = {
  stickersByDay: StickersByDay;
  /** Select a day for the side panel. */
  onOpenDay: (day: DayString) => void;
  /** The day the panel shows, or null. */
  selectedDay: DayString | null;
  /** Every write. See `CalendarBoard.commit`. */
  onCommit: (change: CalendarChange) => void;
  highlight: Highlight | null;
  /** Where a drop would land now, or null. */
  target: DropTarget | null;
  /** Show the caret (false for moods: they land on the day, not in it). */
  caret: boolean;
  /** Set for about half a second after a mark is placed. */
  landed: Landed | null;
  /** Today, or null on the server and during hydration. */
  todayString: DayString | null;
};
