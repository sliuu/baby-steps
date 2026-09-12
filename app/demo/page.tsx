import type { Metadata } from "next";
import { connection } from "next/server";

import { CalendarBoard } from "@/components/dnd/CalendarBoard";
import { DemoShell } from "@/components/demo/DemoShell";
import { TrendsBoard } from "@/components/trends/TrendsBoard";
import { today } from "@/lib/dates";
import { demoLibrary, demoStickers } from "@/lib/demo";

export const metadata: Metadata = {
  title: "Baby Steps · Demo",
  description:
    "A year of habit stickers, with nothing signed in. Look around, drag things about; nothing is saved.",
};

/**
 * The app, full of somebody's year, with no account behind it.
 *
 * The landing page can describe Baby Steps and does. What it cannot do is show
 * the thing the app is actually for — a year of stickers seen at once — because
 * that takes a year of stickers, and a visitor who has not signed in does not
 * have one. This route invents one and renders the real boards over it.
 *
 * **No Suspense, and no skeletons.** `/` splits its two views behind their own
 * boundaries because each is waiting on Postgres and the frame should paint
 * first. There is nothing to wait for here: `demoStickers` is arithmetic, it
 * runs in about a millisecond, and a fallback for it would be a grey box shown
 * for less time than it takes to notice.
 *
 * There is no auth check either, and that is on purpose rather than by
 * omission — `/demo` is in `PUBLIC_PATHS` in `proxy.ts`, and signed in or out
 * you get the same invented year. It reads nothing that belongs to anybody.
 */
export default async function DemoPage() {
  // The one line that keeps the demo from freezing on the day it was built.
  // Everything below is a pure function of `today()`, so with no request-time
  // API in the tree Next would happily prerender this page once and serve that
  // same year for a year — see the `connection` reference. This is the
  // documented way to say "this output is per-request".
  await connection();

  const end = today();
  const groups = demoLibrary();
  const stickersByDay = demoStickers(end);

  return (
    <DemoShell
      // `local` is the whole of the difference between this and the signed-in
      // app: the same board, the same drag, the same day modal, writing to
      // memory instead of to Supabase. See the prop's own note.
      calendar={
        <CalendarBoard groups={groups} stickersByDay={stickersByDay} local />
      }
      trends={
        <TrendsBoard
          groups={groups}
          stickersByDay={stickersByDay}
          initialToday={end}
        />
      }
    />
  );
}
