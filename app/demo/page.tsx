import type { Metadata } from "next";
import { connection } from "next/server";

import { AppShell } from "@/components/AppShell";
import { buttonVariants } from "@/components/ui/button";
import { CalendarBoard } from "@/components/dnd/CalendarBoard";
import { TrendsBoard } from "@/components/trends/TrendsBoard";
import { today } from "@/lib/dates";
import { demoLibrary, demoStickers } from "@/lib/demo";
import { PAGE_WIDTH } from "@/lib/layout";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Baby Steps · Demo",
  description:
    "A year of habit stickers, with nothing signed in. Look around, drag things about; nothing is saved.",
};

/** Real boards, invented year. Public; no Suspense (`demoStickers` is ~1ms). */
export default async function DemoPage() {
  // Per-request so the year ends today, not at build time.
  await connection();

  const end = today();
  const groups = demoLibrary();
  const stickersByDay = demoStickers(end);

  return (
    <AppShell
      banner={
        // Above the frame; scrolls away.
        // A landmark, so screen readers don't skip it.
        <aside aria-label="demo" className="border-b border-rule bg-secondary">
          <p className={`${PAGE_WIDTH} py-s1 text-center text-label text-ink-muted`}>
            demo
          </p>
        </aside>
      }
      navEnd={
        // Back to the landing. Full load, so the invented year is dropped.
        <a
          href="/login"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          exit
        </a>
      }
      // `local`: same board, writes to memory instead of Supabase.
      calendar={
        <CalendarBoard groups={groups} stickersByDay={stickersByDay} local />
      }
      trends={
        <TrendsBoard groups={groups} stickersByDay={stickersByDay} />
      }
    />
  );
}
