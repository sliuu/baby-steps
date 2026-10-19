import { CalendarBoard } from "@/components/dnd/CalendarBoard";
import { getStickerLibrary } from "@/lib/queries/activities";
import { TokenSettlingError } from "@/lib/queries/settling";
import { getStickersByDay } from "@/lib/queries/stickers";

import { CalendarSkeleton } from "./CalendarSkeleton";
import { SettlingRetry } from "./SettlingRetry";

/** Server-side fetching only; layout lives in CalendarBoard (owns the drag context). */
export async function CalendarView() {
  // Run in parallel.
  let data;
  try {
    data = await Promise.all([getStickerLibrary(), getStickersByDay()]);
  } catch (error) {
    // Fresh token not accepted yet: keep the skeleton and retry (SettlingRetry).
    if (error instanceof TokenSettlingError) {
      return (
        <SettlingRetry>
          <CalendarSkeleton />
        </SettlingRetry>
      );
    }
    throw error;
  }
  const [groups, stickersByDay] = data;

  return <CalendarBoard groups={groups} stickersByDay={stickersByDay} />;
}
