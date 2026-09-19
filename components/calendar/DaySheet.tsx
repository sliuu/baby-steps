"use client";

import { Check, Plus, X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";

import { DayNote } from "./DayNote";
import { MoodRow } from "./MoodRow";
import { StickerBar } from "./StickerBar";
import { NewStickerForm } from "@/components/tray/NewStickerForm";
import { DialogOverlay, DialogPortal } from "@/components/ui/dialog";
import type { CalendarChange } from "@/lib/changes";
import {
  formatDayLong,
  formatDayTitle,
  formatWeekdayLong,
  type DayString,
} from "@/lib/dates";
import type { LibraryGroup } from "@/lib/queries/activities";
import { NO_STICKERS, type StickersByDay } from "@/lib/stickers";
import { cn } from "@/lib/utils";

/**
 * Which door you came in by, and the only thing that differs between them.
 *
 * `add` is the day view's "+ Add a sticker": you are already looking at the
 * day, with its mood row and its note field on the screen behind the sheet, so
 * the sheet is the one thing that screen was missing — the library.
 *
 * `day` is a tap on a week row or a month cell: you are looking at seven days
 * or thirty, the day itself is not on the screen, and the sheet has to be the
 * whole day. So it carries the mood and the note as well.
 */
export type DaySheetVariant = "add" | "day";

type Props = {
  /** The day being edited, or null when the sheet is shut. */
  day: DayString | null;
  variant: DaySheetVariant;
  onClose: () => void;
  groups: LibraryGroup[];
  stickersByDay: StickersByDay;
  onCommit: (change: CalendarChange) => void;
  /**
   * The last failed write, or null. Only ever read aloud here — it is *seen* in
   * the page's banner, which sits above the scrim. See the region below.
   */
  error: string | null;
  /** The demo, where there is no database to make a sticker in. */
  local?: boolean;
};

/**
 * The day, as a sheet from the bottom edge.
 *
 * **What it replaces is a drag.** The tray is a drag source and a day is a drop
 * target, and that whole gesture dies on a touch screen — so the tray is now
 * desktop-only (see the `<aside>` in `CalendarBoard`) and the phone's way in is
 * the opposite motion: tap the day, then tap the sticker. Same two nouns, named
 * in the other order.
 *
 * **Why one component for both doors.** The day view could have kept its inline
 * chip list and only the week and month could have got a sheet. They would then
 * be two different pickers with two different rules about what appears in them
 * — the inline one showed you only what was *not* on the day yet, because a
 * placed sticker was already a full-width bar with an × beside it a few pixels
 * above. A sheet has no bars above it to defer to, so it has to show the whole
 * library with the placed ones ticked. Having the day view open the same sheet
 * means there is one answer to "what can go on a day" instead of two.
 *
 * **Every chip is a toggle and nothing asks twice.** Tapping an unticked chip
 * places the sticker, tapping a ticked one takes it off, and the sheet stays
 * open through both — adding four things after a quiet week is one visit, not
 * four. There is no Done and no Save, because every tap has already been
 * written; the close button and the scrim are the same gesture as walking away.
 *
 * **The tick is not decoration.** Colour alone can't carry the selected state:
 * a tinted chip and an untinted one are the same chip to anyone reading in
 * greyscale or with a colour deficiency, and the tint is already doing the job
 * of saying which life area a sticker belongs to. So selected chips gain a
 * check mark, and the chip widens slightly to hold it. `aria-pressed` says the
 * same thing to a screen reader.
 *
 * Radix's `Dialog` is underneath rather than a hand-rolled overlay, and that is
 * worth a line: a sheet is a modal, and the modal part is all the work — focus
 * trapped inside it, Escape closing it, the page behind inert and unscrollable,
 * focus returned to the button you opened it from. None of that is visible and
 * all of it is noticed when missing.
 */
export function DaySheet(props: Props) {
  const day = props.day;
  const stickers = (day && props.stickersByDay.get(day)) || NO_STICKERS;

  const placed = new Set(
    stickers.activities.map((sticker) => sticker.activityId),
  );

  /**
   * The library, grouped, with the empty areas dropped.
   *
   * Archived stickers are left out here and *not* filtered out of `placed`
   * above — a retired sticker that is already on the day still has to be
   * reachable, or it can never come off again. It appears in its group as a
   * ticked chip and disappears the moment you untick it, which is the one
   * sensible reading of "retired": no longer offered, still yours.
   */
  const shown = props.groups
    .map((group) => ({
      ...group,
      stickers: group.stickers.filter(
        (sticker) => !sticker.archived || placed.has(sticker.id),
      ),
    }))
    .filter((group) => group.stickers.length > 0);

  /** The six areas in the shape `NewStickerForm` wants. Same map as the tray's. */
  const areas = props.groups.map((group) => ({
    id: group.areaId,
    name: group.areaName,
    colorKey: group.colorKey,
  }));

  const dayVariant = props.variant === "day";

  return (
    <DialogPrimitive.Root
      open={day !== null}
      onOpenChange={(open) => {
        if (!open) props.onClose();
      }}
    >
      <DialogPortal>
        {/* Darker than the dialog's own 10%, and the reason is geometry rather
            than taste: a centred dialog is a small panel in the middle of a
            dimmed page and the dimming is most of what separates them, while a
            sheet shares an edge with the page it covers. At 10% the top of the
            sheet and the page above it read as one surface with a line across
            it. */}
        <DialogOverlay className="bg-ink/25" />

        <DialogPrimitive.Content
          // No description, deliberately. The sub-line under the title is the
          // description, and Radix can't be told that without an id dance for a
          // sentence that is already the next thing you read.
          aria-describedby={undefined}
          className={cn(
            // `dvh` and not `vh`: on iOS Safari `vh` is the height with the URL
            // bar hidden, so a sheet capped at 85vh is taller than the visible
            // window while the bar is showing and its bottom edge — the note
            // field, in the day variant — sits under the chrome.
            //
            // `max-w` with `mx-auto` rather than a width and a transform. The
            // enter animation translates the element, and a `-translate-x-1/2`
            // centring it would be a second translate on the same property to
            // reconcile. Margins don't animate here, so nothing collides.
            "fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[85dvh] w-full max-w-[34rem] flex-col gap-3",
            "rounded-t-2xl border-t border-rule bg-bg px-[1.125rem] pt-2.5 pb-[calc(1.375rem+env(safe-area-inset-bottom))]",
            // The only shadow on this screen, and it points upward — the sheet
            // is lit from the page it is covering.
            "shadow-[0_-10px_30px_rgb(70_50_20/0.14)] outline-none",
            "data-open:animate-sheet-in data-closed:animate-sheet-out",
          )}
        >
          {/* Affordance only. Drag-to-dismiss would need pointer handling that
              nothing else in this app has, and the scrim and the × are both
              one tap. */}
          <span
            aria-hidden="true"
            className="mx-auto mb-1 h-1 w-10 shrink-0 rounded-full bg-rule"
          />

          <header className="flex shrink-0 items-end justify-between gap-2.5">
            <div className="min-w-0">
              {/* "17 September", not "Sept 17". The day view's masthead sets
                  the date this way and the two are the same day seen twice —
                  a sheet that renamed it would read as a different record. */}
              <DialogPrimitive.Title className="font-heading truncate text-[1.625rem] leading-[1.15]">
                {dayVariant && day ? formatDayTitle(day) : "Add a sticker"}
              </DialogPrimitive.Title>
              <p className="mt-1 text-[0.78rem] text-ink-muted">
                {day === null
                  ? null
                  : dayVariant
                    ? formatWeekdayLong(day)
                    : `Tap any you did on ${formatDayTitle(day)}`}
              </p>
            </div>

            <DialogPrimitive.Close
              aria-label="Close"
              className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-ink-muted transition-colors hover:text-ink"
            >
              <X className="size-4" strokeWidth={1.8} aria-hidden="true" />
            </DialogPrimitive.Close>
          </header>

          {/* **Heard here, seen in the page's banner.** An open Radix dialog
              marks everything outside its content `aria-hidden`, so the
              `role="status"` banner in `CalendarBoard` is drawn over the scrim
              but never announced — and a failed tap in this sheet is the
              likeliest failure there is. This is the copy a screen reader can
              reach. It is `sr-only` because the banner already says it on
              screen, and it is mounted with the sheet and before any error, so
              the text arriving is a change it can announce. */}
          <div role="status" aria-live="polite" className="sr-only">
            {props.error}
          </div>

          {/* The one scrolling region. The header and the grabber stay put; in
              the day variant the mood row at the top and the note at the bottom
              scroll with the library between them rather than pinning to the
              edges — a note pinned under a scroller is a second scroll area on
              a phone, and the keyboard would then open over the thing it is
              editing. */}
          <div className="-mx-[1.125rem] flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-[1.125rem] pt-0.5 pb-1">
            {day !== null && (
              <>
                {/* First, above the library, which is the tray's own
                    ordering on a wide screen and the day view's under its
                    date. The argument is the same in all three: how it felt is
                    the thing you always have to say, and the areas below are
                    the ones you say something about only if you did them. It
                    is also the fixed row — five faces, never a different five —
                    so it makes a better opening than a list whose shape depends
                    on what you happen to own. */}
                {dayVariant && (
                  <section>
                    <h3 className="eyebrow">How it felt</h3>
                    <div className="mt-2">
                      <MoodRow
                        day={day}
                        mood={stickers.mood}
                        onCommit={props.onCommit}
                      />
                    </div>
                  </section>
                )}

                <div className="flex flex-col gap-3.5">
                  {shown.map((group) => (
                    <section key={group.areaId}>
                      <h3 className="eyebrow">{group.areaName}</h3>
                      <ul className="mt-2 flex flex-wrap gap-2">
                        {group.stickers.map((sticker) => {
                          const on = placed.has(sticker.id);
                          return (
                            <li key={sticker.id}>
                              <button
                                type="button"
                                aria-pressed={on}
                                aria-label={`${sticker.name} on ${formatDayLong(day)}`}
                                onClick={() =>
                                  props.onCommit(
                                    on
                                      ? {
                                          kind: "remove",
                                          day,
                                          activityId: sticker.id,
                                        }
                                      : {
                                          kind: "place",
                                          day,
                                          activityId: sticker.id,
                                          face: sticker,
                                          // The end of the day — the same index
                                          // the day modal's checkbox names and
                                          // the same one a drop with no slot
                                          // under it lands at. Nothing in this
                                          // sheet offers an order, so all three
                                          // doors agree about that.
                                          index: stickers.activities.length,
                                        },
                                  )
                                }
                                className="flex rounded-sm transition-opacity active:opacity-60"
                              >
                                <StickerBar
                                  sticker={sticker}
                                  trailing={
                                    on ? (
                                      <Check
                                        className="size-3.5 shrink-0"
                                        strokeWidth={2.2}
                                        aria-hidden="true"
                                      />
                                    ) : null
                                  }
                                  className={cn(
                                    // 42px and the same bar the day view
                                    // draws, so a chip in here and a sticker on
                                    // a day are visibly one object.
                                    "min-h-[2.625rem] w-auto gap-2 px-2.5 py-2 text-[0.875rem]",
                                    // Unticked: the tint, the rim and the paper
                                    // shadow all come off. `StickerBar` owns
                                    // the mark and the name, and overriding its
                                    // surface here is what keeps the drawing in
                                    // one component instead of forking a second
                                    // chip that has to be kept in step.
                                    !on &&
                                      "border-hairline bg-surface-sunken text-ink-muted shadow-none",
                                  )}
                                />
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  ))}

                  {/* Last, and after the groups rather than inside one: a new
                      sticker has no area yet, which is the first field of the
                      form behind it. Dashed, the same grammar the day view's
                      add button uses — the shape of a sticker that isn't there.

                      Absent in the demo, where there is no database to write
                      to. The tray makes the same omission the same way. */}
                  {!props.local && (
                    <NewStickerForm
                      areas={areas}
                      trigger={
                        <button
                          type="button"
                          className="flex min-h-[2.625rem] items-center gap-1.5 self-start rounded-sm border border-dashed border-rule px-2.5 text-[0.83rem] text-ink-muted transition-colors hover:bg-ink/5 hover:text-ink"
                        >
                          <Plus
                            className="size-4"
                            strokeWidth={1.5}
                            aria-hidden="true"
                          />
                          New sticker
                        </button>
                      }
                    />
                  )}

                  {/* Only in the demo. Everywhere else the dashed chip above
                      *is* the empty state — a library with nothing in it is a
                      sheet holding one control that says how to fill it, which
                      is better than a sentence and a control saying the same
                      thing twice. The demo has no chip, so it needs the
                      sentence. */}
                  {shown.length === 0 && props.local && (
                    <p className="text-[0.83rem] text-ink-muted">
                      No stickers in the demo yet.
                    </p>
                  )}
                </div>

                {dayVariant && (
                  <section>
                    <h3 className="eyebrow">Note</h3>
                    {/* `key` on the day, so opening the sheet on another date
                        never inherits an unsent draft. Same guard the day view
                        puts on its own note. */}
                    <DayNote
                      key={day}
                      day={day}
                      note={stickers.note}
                      onCommit={props.onCommit}
                    />
                  </section>
                )}
              </>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </DialogPrimitive.Root>
  );
}
