import { MoodMark } from "@/components/calendar/MoodMark";
import { StickerMark } from "@/components/calendar/StickerMark";
import { TrayGroup, TrayRow } from "@/components/tray/TrayGroup";
import { Button } from "@/components/ui/button";
import { MOOD_LABEL, MOODS } from "@/lib/moods";
import type { LibraryGroup } from "@/lib/queries/activities";

type Props = {
  groups: LibraryGroup[];
};

/**
 * The palette beside the calendar: every sticker you own, grouped by life area,
 * with the five moods last.
 *
 * Presentational. It takes a finished list and renders it — no query, no state,
 * no idea where the data came from. CalendarView does the fetching. That split
 * is what will let Step 8 wrap this in a drag context without touching the
 * loading of anything, and what lets this file be read top to bottom as layout.
 */
export function StickerTray(props: Props) {
  return (
    <div className="flex flex-col gap-7">
      <header>
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-heading text-2xl leading-none">Your stickers</h2>
          {/* Inert until Step 10. Present now so the header's proportions are
              settled before there's a form behind it. */}
          <Button
            variant="outline"
            size="icon-sm"
            disabled
            aria-label="New sticker"
            title="New sticker"
          >
            <span aria-hidden="true" className="text-base leading-none">
              +
            </span>
          </Button>
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
            {group.stickers.map((sticker) => (
              <TrayRow
                key={sticker.id}
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
              visual={<MoodMark mood={mood} />}
              name={MOOD_LABEL[mood]}
            />
          ))}
        </TrayGroup>
      </div>
    </div>
  );
}
