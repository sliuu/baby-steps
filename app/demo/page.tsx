import type { Metadata } from "next";
import { connection } from "next/server";

import { AppShell } from "@/components/AppShell";
import { CalendarBoard } from "@/components/dnd/CalendarBoard";
import { TrendsBoard } from "@/components/trends/TrendsBoard";
import { today } from "@/lib/dates";
import { demoLibrary, demoStickers } from "@/lib/demo";
import { PAGE_WIDTH } from "@/lib/layout";

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
    <AppShell
      // The same shell as `/`, with the two slots that differ filled in here:
      // a banner saying what this is, and a way out where the account menu
      // would be.
      banner={
        // Above the sticky header rather than inside it, and it scrolls away.
        // A banner is an answer to "what am I looking at", which is a question
        // you have once, on arrival — pinning it to the top of the window
        // would spend a permanent band of the screen restating it. The way
        // *out* of the demo is the part that has to stay reachable, and that
        // is the link in the nav, which is sticky.
        <div className="border-b border-hairline bg-secondary/60">
          <p className={`${PAGE_WIDTH} py-2.5 text-[0.83rem] text-ink-muted`}>
            <span className="text-ink">This is a demo.</span> A year of
            invented stickers, ending today. Drag them about, change a mood,
            write a note — nothing you do here is saved anywhere.
          </p>
        </div>
      }
      navEnd={
        // A real navigation, not a router push: leaving the demo should drop
        // everything in it, and a full load is the cheapest way to be sure a
        // year of invented stickers is gone. `ml-1` because the nav's gap is
        // sized for an avatar, and a bordered control wants a little more room
        // from the toggle. Its corner is the nav segments' — it stands in the
        // same bar as them, and it was the last stadium left in it.
        <a
          href="/login"
          className="ml-1 rounded-sm border border-hairline px-4 py-1.5 text-[0.875rem] transition-colors hover:bg-secondary"
        >
          Sign in
        </a>
      }
      // `local` is the whole of the difference between the boards here and in
      // the signed-in app: the same board, the same drag, the same day modal,
      // writing to memory instead of to Supabase. See the prop's own note.
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
