"use client";

import { useState } from "react";

import type { Pick } from "@/app/actions/onboarding";
import { AppShell } from "@/components/AppShell";
import { CalendarBoard } from "@/components/dnd/CalendarBoard";
import { TrendsBoard } from "@/components/trends/TrendsBoard";
import { stepKey, type TourActions } from "@/components/tour/Tour";
import { demoLibrary } from "@/lib/demo";
import type { LibraryGroup } from "@/lib/queries/activities";
import type { StickersByDay } from "@/lib/stickers";

const NO_DAYS: StickersByDay = new Map();

/** A new account: the six categories, no stickers. Picks go into memory. */
export function TourPreview() {
  const [groups, setGroups] = useState<LibraryGroup[]>(() => {
    // Every load starts the tour over.
    try {
      localStorage.removeItem(stepKey("preview"));
    } catch {}
    return demoLibrary().map((group) => ({ ...group, stickers: [] }));
  });

  const [tour] = useState<TourActions>(() => ({
    user: "preview",
    save: async (picks: Pick[]) => {
      setGroups((was) =>
        was.map((group) => ({
          ...group,
          stickers: [
            ...group.stickers,
            ...picks
              .filter((p) => p.categoryId === group.categoryId)
              .map((p) => ({ id: `tour-${p.name}`, name: p.name, mark: p.mark, colorKey: group.colorKey, archived: false })),
          ],
        })),
      );
      return { ok: true, message: "" };
    },
    finish: async () => ({ ok: true, message: "" }),
  }));

  return (
    <AppShell
      tour={tour}
      navEnd={<a href="/dev/tour" className="text-label text-ink-muted hover:text-ink">restart</a>}
      calendar={<CalendarBoard groups={groups} stickersByDay={NO_DAYS} local />}
      trends={<TrendsBoard groups={groups} stickersByDay={NO_DAYS} />}
    />
  );
}
