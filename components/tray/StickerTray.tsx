"use client";

import { MoodMark } from "@/components/calendar/MoodMark";
import { StickerMark } from "@/components/calendar/StickerMark";
import { NewStickerForm } from "@/components/tray/NewStickerForm";
import { TrayGroup, TrayRow } from "@/components/tray/TrayGroup";
import { sameSelection, type Selection } from "@/lib/highlight";
import { TRAY_INSET } from "@/lib/layout";
import { MOOD_LABEL, MOODS } from "@/lib/moods";
import { wash } from "@/lib/palette";
import type { LibraryGroup } from "@/lib/queries/activities";

type Props = {
  groups: LibraryGroup[];
  /** What's lit, or null. Owned by the board — see there for why. */
  selection: Selection | null;
  /** Always a *new* selection; the board decides whether that means "clear". */
  onSelect: (selection: Selection) => void;
  onClear: () => void;
  /**
   * What to call the selection on screen, resolved by the board.
   *
   * Passed rather than worked out here, even though the tray holds the groups
   * and could. `buildHighlight` already computes this exact string to label the
   * days, and a second implementation of "what is this called" is the drift
   * this project keeps refusing. Null when nothing is lit — including the case
   * where something is selected but no longer exists.
   */
  label: string | null;
};

/**
 * The palette beside the calendar: every sticker you own, grouped by life area,
 * with the five moods last.
 *
 * Still presentational, and Step 11 kept it that way on purpose. It renders the
 * selection it's handed and reports clicks upward; it doesn't decide that
 * clicking a lit row clears it, doesn't know which days are lit, and doesn't
 * own the value. Same seam as always — "who fetches" and now also "who
 * remembers" versus "who draws".
 *
 * The reason the selection can't live here is the plainest possible case of
 * lifting state up: the tray sets it and the *grid* renders it, and the two are
 * siblings. The lowest component containing both is `CalendarBoard`, which
 * already exists because a drag needed exactly the same thing.
 */
export function StickerTray(props: Props) {
  const { selection, onSelect } = props;

  /** Lit when it's what's selected, and clicking it again clears it. */
  function toggle(next: Selection) {
    if (sameSelection(selection, next)) props.onClear();
    else onSelect(next);
  }

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

        {/* The line under the heading does double duty, because a mode with no
            visible way out is a trap. While something is lit it says what, and
            offers the exit — the lit row itself is the other way out, but it
            can be scrolled off the bottom of a long rail, and this never is. */}
        <p className="mt-2 text-[0.9rem] text-ink-muted">
          {props.label ? (
            <>
              Showing <span className="text-ink">{props.label}</span> ·{" "}
              <button
                type="button"
                onClick={props.onClear}
                className="underline underline-offset-2 hover:text-ink"
              >
                clear
              </button>
            </>
          ) : (
            "Drag one onto a day"
          )}
        </p>
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
        {props.groups.map((group) => {
          const areaSelection: Selection = {
            kind: "area",
            areaId: group.areaId,
          };

          return (
            <TrayGroup
              key={group.areaId}
              label={group.areaName}
              // Clicking the label lights every sticker under it at once —
              // which downstream is just a bigger set of activity ids, not a
              // second kind of highlight.
              onSelect={() => toggle(areaSelection)}
              selected={sameSelection(selection, areaSelection)}
              wash={wash(group.colorKey)}
            >
              {/* An area with nothing in it was a bare label with a gap under it
                  until Step 10 — which read as something failing to load. Now
                  that the `+` works it's a state you can be in on purpose and
                  get out of, so it says so. Sits inside the <ul> as a real <li>,
                  because an empty list with a paragraph next to it is a lie a
                  screen reader repeats. */}
              {group.stickers.length === 0 && (
                <li className={`${TRAY_INSET} py-1 text-[0.9rem] text-ink-muted`}>
                  Nothing here yet
                </li>
              )}

              {group.stickers.map((sticker) => {
                const stickerSelection: Selection = {
                  kind: "activity",
                  activityId: sticker.id,
                };

                return (
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
                    selected={sameSelection(selection, stickerSelection)}
                    wash={wash(sticker.colorKey)}
                    onSelect={() => toggle(stickerSelection)}
                  />
                );
              })}
            </TrayGroup>
          );
        })}

        {/* Last, and not from the database: the five moods are fixed by the
            CHECK constraint on day_moods, so there is nothing to fetch.

            No `onSelect` on the group. "Mood" isn't a thing you can highlight —
            it names five things that each are, and a heading that lit nothing
            would be a control that does nothing. */}
        <TrayGroup label="Mood">
          {MOODS.map((mood) => {
            const moodSelection: Selection = { kind: "mood", mood };

            return (
              <TrayRow
                key={mood}
                dragId={mood}
                payload={{ kind: "mood", mood }}
                visual={<MoodMark mood={mood} />}
                name={MOOD_LABEL[mood]}
                selected={sameSelection(selection, moodSelection)}
                // Ink, not a ramp — the same null that `MoodMark` has always
                // meant by refusing to carry a colour.
                wash={wash(null)}
                onSelect={() => toggle(moodSelection)}
              />
            );
          })}
        </TrayGroup>
      </div>
    </div>
  );
}
