import { TrendsBoard } from "@/components/trends/TrendsBoard";
import { today } from "@/lib/dates";
import { getStickerLibrary } from "@/lib/queries/activities";
import { getStickersByDay } from "@/lib/queries/stickers";

/**
 * Async, and a Server Component — the same seam as `CalendarView`, and the same
 * two queries.
 *
 * Both tabs want the same data, which is why neither one narrows it: the
 * calendar needs every placement to draw any month, and trends needs every
 * placement to count any range. Requesting them once each here rather than once
 * per range change is the whole reason switching to "All time" is instant.
 *
 * `getStickerLibrary` is the second query, and trends needs it for two things
 * the placements can't answer: which area each activity belongs to, and which
 * areas exist at all. An area you've never used still gets a row — six labelled
 * areas is what tells you the six exist, the same argument the tray makes.
 */
export async function TrendsView() {
  const [groups, stickersByDay] = await Promise.all([
    getStickerLibrary(),
    getStickersByDay(),
  ]);

  return (
    <TrendsBoard
      groups={groups}
      stickersByDay={stickersByDay}
      // Read on the server so the first paint has a real range rather than a
      // blank one, and passed down so the browser's hydration render uses the
      // same value. The visitor's own date takes over a frame later.
      initialToday={today()}
    />
  );
}
