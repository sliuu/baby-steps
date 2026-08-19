import { CalendarBoard } from "@/components/dnd/CalendarBoard";
import { getStickerLibrary } from "@/lib/queries/activities";
import { getStickersByDay } from "@/lib/queries/stickers";

/**
 * Async, and a Server Component — so the database calls happen on the server
 * and the browser receives finished HTML.
 *
 * All that's left here is the fetching. The layout moved into CalendarBoard in
 * Step 8, because a drag context has to sit above both the thing you pick up
 * and the thing you drop it on, and those were siblings under this component.
 * The seam is still the one Step 7 drew — this file knows where the data comes
 * from, and nothing below it does.
 */
export async function CalendarView() {
  // Both queries start before either is awaited, so the page waits for the
  // slower one rather than for the two of them end to end.
  const [groups, stickersByDay] = await Promise.all([
    getStickerLibrary(),
    getStickersByDay(),
  ]);

  return <CalendarBoard groups={groups} stickersByDay={stickersByDay} />;
}
