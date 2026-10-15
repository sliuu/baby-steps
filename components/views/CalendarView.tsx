import { CalendarBoard } from "@/components/dnd/CalendarBoard";
import { getStickerLibrary } from "@/lib/queries/activities";
import { TokenSettlingError } from "@/lib/queries/settling";
import { getStickersByDay } from "@/lib/queries/stickers";

import { CalendarSkeleton } from "./CalendarSkeleton";
import { SettlingRetry } from "./SettlingRetry";

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
  let data;
  try {
    data = await Promise.all([getStickerLibrary(), getStickersByDay()]);
  } catch (error) {
    // Right after sign-in, a token some verifier won't accept yet. A fresh
    // request clears it, so keep the skeleton up and make one — see
    // SettlingRetry. Anything else is a real failure and goes to app/error.tsx.
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
