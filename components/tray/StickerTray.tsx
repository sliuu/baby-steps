"use client";

import { MoodMark } from "@/components/calendar/MoodMark";
import { StickerMark } from "@/components/calendar/StickerMark";
import { NewStickerForm } from "@/components/tray/NewStickerForm";
import { TrayGroup, TrayRow } from "@/components/tray/TrayGroup";
import { TRAY_INSET } from "@/lib/layout";
import { MOOD_LABEL, MOODS } from "@/lib/moods";
import type { LibraryGroup } from "@/lib/queries/activities";

type Props = {
  groups: LibraryGroup[];
};

/**
 * The palette beside the calendar: every sticker you own, grouped by life area,
 * with the five moods last.
 *
 * Still presentational: it takes a finished list and renders it — no query, no
 * state, no idea where the data came from. That's what let Step 8 wrap it in a
 * drag context without touching the loading of anything.
 *
 * It did have to become a Client Component, though. Every row is now something
 * you can pick up, and `useDraggable` is a hook. The seam that mattered held
 * anyway — "who fetches" is still somewhere else, and this file still reads top
 * to bottom as layout.
 */
export function StickerTray(props: Props) {
  return (
    <div className="flex flex-col gap-7">
      {/* Inset to match the rows, so the wordmark of the rail sits above the
          stickers rather than a few pixels left of them. The + button rides the
          same padding in from the right edge. */}
      <header className={TRAY_INSET}>
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-heading text-2xl leading-none">Your stickers</h2>
          {/* The `+` and everything behind it. The tray hands it the six areas
              it is already grouped by, rather than the form fetching them:
              they're the same six rows, and two queries for one list is how
              the dropdown and the groups end up disagreeing. */}
          <NewStickerForm
            areas={props.groups.map((group) => ({
              id: group.areaId,
              name: group.areaName,
              colorKey: group.colorKey,
            }))}
          />
        </div>
        <p className="mt-2 text-[0.9rem] text-ink-muted">Drag one onto a day</p>
      </header>

      {/* The groups lie in a grid, not a stack, and the number of columns is the
          only thing that changes between the two places this tray lives.

          In the rail (lg and up) it's one column, because the rail is 18rem
          wide. Below that the tray sits under the calendar with the full page
          to spend, and a single 18rem column down the middle of it would be a
          thin ribbon with the whole width empty either side. Each group keeps
          its own vertical list of names — it's the groups that spread out, not
          the stickers inside them, so a label always sits directly above the
          stickers it names. */}
      <div className="grid grid-cols-2 items-start gap-x-8 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-1">
        {props.groups.map((group) => (
          <TrayGroup key={group.areaId} label={group.areaName}>
            {/* An area with nothing in it was a bare label with a gap under it
                until this step — which read as something failing to load. Now
                that the `+` works it's a state you can be in on purpose and
                get out of, so it says so. Sits inside the <ul> as a real <li>,
                because an empty list with a paragraph next to it is a lie a
                screen reader repeats. */}
            {group.stickers.length === 0 && (
              <li className={`${TRAY_INSET} py-1 text-[0.9rem] text-ink-muted`}>
                Nothing here yet
              </li>
            )}

            {group.stickers.map((sticker) => (
              <TrayRow
                key={sticker.id}
                dragId={sticker.id}
                payload={{
                  kind: "activity",
                  activityId: sticker.id,
                  face: sticker,
                }}
                visual={<StickerMark sticker={sticker} />}
                name={sticker.name}
              />
            ))}
          </TrayGroup>
        ))}

        {/* Last, and not from the database: the five moods are fixed by the
            CHECK constraint on day_moods, so there is nothing to fetch. */}
        <TrayGroup label="Mood">
          {MOODS.map((mood) => (
            <TrayRow
              key={mood}
              dragId={mood}
              payload={{ kind: "mood", mood }}
              visual={<MoodMark mood={mood} />}
              name={MOOD_LABEL[mood]}
            />
          ))}
        </TrayGroup>
      </div>
    </div>
  );
}
