import { TrendsBoard } from "@/components/trends/TrendsBoard";
import { getStickerLibrary } from "@/lib/queries/activities";
import { TokenSettlingError } from "@/lib/queries/settling";
import { getStickersByDay } from "@/lib/queries/stickers";

import { SettlingRetry } from "./SettlingRetry";
import { TrendsSkeleton } from "./TrendsSkeleton";

/** Same two queries as `CalendarView`, unnarrowed so ranges switch instantly. */
export async function TrendsView() {
  let data;
  try {
    data = await Promise.all([getStickerLibrary(), getStickersByDay()]);
  } catch (error) {
    if (error instanceof TokenSettlingError) {
      return (
        <SettlingRetry>
          <TrendsSkeleton />
        </SettlingRetry>
      );
    }
    throw error;
  }
  const [groups, stickersByDay] = data;

  return (
    <TrendsBoard groups={groups} stickersByDay={stickersByDay} />
  );
}
