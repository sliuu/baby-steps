"use client";

import { MoodMark } from "@/components/calendar/MoodMark";
import { StickerMark } from "@/components/calendar/StickerMark";
import { TrayRowFace } from "@/components/tray/TrayGroup";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { CalendarChange } from "@/lib/changes";
import { formatDayLong, type DayString } from "@/lib/dates";
import { MOOD_LABEL, MOODS, isMood } from "@/lib/moods";
import type { LibraryGroup } from "@/lib/queries/activities";
import type { DayStickers } from "@/lib/stickers";

/** The radio value standing for "this day has no mood". Not a sixth mood. */
const NO_MOOD = "none";

/**
 * One row of the list: a hover band, the same as a tray row.
 *
 * The negative margin is the part worth reading. A band has to extend past its
 * text on both sides or the highlight looks clamped to the checkbox, but padding
 * the row alone would push every name right of the heading above it. So the row
 * reaches back out by exactly what the scrolling container pads in — the two
 * cancel, text lines up with the heading and the dialog's title, and the band
 * still stops at the container's edge rather than past it.
 *
 * That last part is the constraint, not a detail: `overflow-y: auto` on the
 * container promotes `overflow-x` to `auto` alongside it, so anything genuinely
 * wider than the content box is a horizontal scrollbar. Same rule as the rail,
 * and the same reason the numbers here have to match `SCROLL_PAD`.
 */
const ROW = "-mx-2 flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-ink/5";

/** What `ROW` reaches back out of. The two are one decision; keep them equal. */
const SCROLL_PAD = "-mx-2 px-2";

type Props = {
  /** The open day, or null for closed. One value, so the two can't disagree. */
  day: DayString | null;
  stickers: DayStickers;
  groups: LibraryGroup[];
  onClose: () => void;
  onCommit: (change: CalendarChange) => void;
};

/**
 * The second door into the same room.
 *
 * Everything here builds a `CalendarChange` and hands it to `onCommit` — the
 * identical function the drag handler calls. So this component holds no rules
 * about what a change means, no copy of the optimistic redraw, and no idea
 * which server action it just caused. Ticking a box and dropping a sticker are
 * the same event by the time anything acts on them, which is the only reliable
 * way to keep two interfaces over one dataset from drifting apart.
 *
 * It also holds no state. The checkboxes and the radio are *controlled*, and
 * what controls them is the optimistic Map that `CalendarBoard` already owns.
 * Local state here would be a second copy of the truth that has to be synced
 * back — and would visibly disagree the moment a write failed and the optimistic
 * value expired. Reading straight from the prop means a rolled-back sticker
 * un-ticks its own box with no code to do it.
 *
 * The focus trap, Escape, click-outside, returning focus to the day you came
 * from, `aria-modal`, and making the rest of the page inert are all Radix's, in
 * `components/ui/dialog.tsx`. Worth reading once: it is a lot of behaviour, it
 * is genuinely hard to get right by hand, and it's our file now.
 */
export function DayModal(props: Props) {
  const { day, stickers, groups, onClose, onCommit } = props;

  // Which activities are on this day, as a Set — the checkbox list is built
  // from the library, so every row asks this once and an array would make that
  // a scan per row.
  const placed = new Set(stickers.activities.map((s) => s.activityId));

  return (
    <Dialog
      open={day !== null}
      // Radix reports every way it can close — Escape, the overlay, the X — as
      // one event. Handling it in one place is why none of them need their own
      // wiring here.
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {/* Wider than the default `sm:max-w-sm`, which is sized for a confirm
          prompt rather than a list. The body scrolls on its own once a long
          library outgrows the window — vertically only, same rule as the tray:
          names truncate rather than widening the panel. */}
      <DialogContent className="sm:max-w-md">
        {day && (
          <>
            <DialogHeader>
              <DialogTitle className="text-dialog-title">
                {formatDayLong(day)}
              </DialogTitle>
              <DialogDescription>
                Tick what happened, and how it felt.
              </DialogDescription>
            </DialogHeader>

            <div
              className={`${SCROLL_PAD} flex max-h-[60vh] flex-col gap-6 overflow-y-auto py-1`}
            >
              {groups.map((group) => {
                /**
                 * What you can tick here: everything still in use, plus any
                 * archived sticker that's already on this day.
                 *
                 * The second half is the whole rule. Archiving takes a sticker
                 * out of circulation, so it must not be addable — but a mark
                 * you put on a day before you retired it is still on that day,
                 * and the checkbox is the only way to take it off. Hiding it
                 * outright would leave a mark on the calendar with no control
                 * anywhere that can remove it.
                 */
                const visible = group.stickers.filter(
                  (sticker) => !sticker.archived || placed.has(sticker.id),
                );

                // A life area whose stickers are all archived and all unused
                // today has nothing to say. The heading would be the only
                // thing in it.
                if (visible.length === 0) return null;

                return (
                <section key={group.areaId}>
                  <h3 className="eyebrow">{group.areaName}</h3>
                  {/* Tight, because each row now carries its own vertical
                      padding — it's a hover band, not a line of text. Same
                      adjustment the tray made for the same reason. */}
                  <ul className="mt-1.5 flex flex-col gap-0.5">
                    {visible.map((sticker) => {
                      const inputId = `day-activity-${sticker.id}`;
                      return (
                        <li key={sticker.id} className={ROW}>
                          <Checkbox
                            id={inputId}
                            checked={placed.has(sticker.id)}
                            onCheckedChange={(checked) =>
                              onCommit(
                                checked === true
                                  ? {
                                      kind: "place",
                                      day,
                                      activityId: sticker.id,
                                      face: sticker,
                                      // The end of the day's run. A checkbox
                                      // has no caret to read — the ordering
                                      // gesture is the drag, and this door only
                                      // says whether the mark is there at all.
                                      // Naming the index anyway rather than
                                      // letting it default is the point of it
                                      // being required: "the end" is a choice
                                      // this list made, not one it inherited.
                                      index: stickers.activities.length,
                                    }
                                  : {
                                      kind: "remove",
                                      day,
                                      activityId: sticker.id,
                                    },
                              )
                            }
                          />
                          {/* The same face the tray draws, so a sticker looks
                              identical in all three places it appears. */}
                          <label
                            htmlFor={inputId}
                            className="flex min-w-0 flex-1 items-center gap-2.5"
                          >
                            <TrayRowFace
                              visual={<StickerMark sticker={sticker} />}
                              name={sticker.name}
                            />
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </section>
                );
              })}

              <section>
                <h3 className="eyebrow">Mood</h3>
                <RadioGroup
                  className="mt-1.5 gap-0.5"
                  // The absence of a mood is a value the picker has to be able
                  // to hold, or an uncontrolled radio would reset to whatever
                  // was last chosen. `??` is what maps "no row" onto it.
                  value={stickers.mood ?? NO_MOOD}
                  onValueChange={(value) =>
                    onCommit(
                      isMood(value)
                        ? { kind: "mood", day, mood: value }
                        : { kind: "clearMood", day },
                    )
                  }
                >
                  {MOODS.map((mood) => (
                    <div key={mood} className={ROW}>
                      <RadioGroupItem value={mood} id={`day-mood-${mood}`} />
                      <label
                        htmlFor={`day-mood-${mood}`}
                        className="flex min-w-0 flex-1 items-center gap-2.5"
                      >
                        <TrayRowFace
                          visual={<MoodMark mood={mood} />}
                          name={MOOD_LABEL[mood]}
                        />
                      </label>
                    </div>
                  ))}

                  {/* Sixth in the list, but not a sixth mood — choosing it
                      deletes the row. Present because "no mood" is the state
                      most days are in, and a picker that can't return to it
                      makes a mis-click permanent. */}
                  <div className={ROW}>
                    <RadioGroupItem value={NO_MOOD} id="day-mood-none" />
                    <label
                      htmlFor="day-mood-none"
                      className="min-w-0 flex-1 text-[0.9rem] text-ink-muted"
                    >
                      No mood
                    </label>
                  </div>
                </RadioGroup>
              </section>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
