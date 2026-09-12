"use client";

import { ChevronRight } from "lucide-react";
import { useState } from "react";

import { StickerMark } from "@/components/calendar/StickerMark";
import { EditStickerForm } from "@/components/tray/EditStickerForm";
import { MoodPicker } from "@/components/tray/MoodPicker";
import { NewStickerForm } from "@/components/tray/NewStickerForm";
import { RestoreStickerButton } from "@/components/tray/RestoreStickerButton";
import { ArchivedRow, TrayGroup, TrayRow } from "@/components/tray/TrayGroup";
import { sameSelection, type Selection } from "@/lib/highlight";
import { TRAY_INSET } from "@/lib/layout";
import { faceOf } from "@/lib/stickers";
import { wash } from "@/lib/palette";
import type { LibraryGroup, LibrarySticker } from "@/lib/queries/activities";

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
  /**
   * Activity id → how many days it's on. Only the delete confirmation reads it.
   *
   * Built by the board, which is already holding every placement for the grid.
   * Counting here would mean the tray taking the whole calendar as a prop to
   * answer a question about six numbers.
   */
  markCounts: Map<string, number>;
  /** Archiving, restoring and deleting report failures through the board's line. */
  onError: (message: string) => void;
  /**
   * Demo mode: the calendar keeps changes in memory and writes nothing.
   *
   * Everything the tray does to the *calendar* — dragging a sticker onto a
   * day, lighting an area, picking a mood — works unchanged in a demo, because
   * all of it goes through the board's `commit` and never touches the network.
   * What the tray also does is manage the library itself: the `+`, the editor,
   * the restore button. Those are Server Actions with no in-memory version, and
   * a signed-out visitor pressing one would get a failure message about a
   * session they never had.
   *
   * So they come off. Not disabled — absent, which is the only state that
   * doesn't invite a click. The demo is a picture of a year you already have,
   * and making a new sticker is the first thing signing in is *for*.
   */
  local?: boolean;
};

/**
 * The palette beside the calendar: the five moods, then every sticker you own,
 * grouped by life area.
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

  /**
   * Which sticker's editor is open, as an id rather than the sticker itself.
   *
   * One editor for the whole tray, since the swap: the row body opens it, so
   * there is no per-row trigger left to hang fifteen dialogs off. Holding the
   * id and looking the sticker up again on every render is the part that
   * matters — `refresh()` after a save hands down new groups, and a stored copy
   * of the object would keep showing the old name. It also means deleting the
   * sticker closes the dialog on its own: the lookup stops finding anything, so
   * there's nothing left to render.
   */
  const [editing, setEditing] = useState<string | null>(null);

  /**
   * The six areas in the shape both dialogs want.
   *
   * Built once here rather than inside each row, because the edit form needs
   * the same list the `+` does and there are fifteen rows. The tray hands it
   * down rather than the forms fetching it: they're the same six rows already
   * on screen, and two queries for one list is how a dropdown and the groups it
   * describes end up disagreeing.
   */
  const areas = props.groups.map((group) => ({
    id: group.areaId,
    name: group.areaName,
    colorKey: group.colorKey,
  }));

  /**
   * The retired ones, from every area at once.
   *
   * Flattened rather than left under their headings, because six areas each
   * with an "Archived" fold under it is six folds to open to find one sticker,
   * and the reason you're looking is usually that you don't remember where you
   * put it. They keep their area's colour, so the grouping is still legible
   * without being structural.
   *
   * `getStickerLibrary` returns these alongside the active ones now — the query
   * stopped filtering so that `tally` could keep counting their marks. Which
   * means every list that draws stickers has to say which kind it wants, and
   * this is the tray saying it.
   */
  const archived = props.groups.flatMap((group) =>
    group.stickers.filter((sticker) => sticker.archived),
  );

  /**
   * The sticker being edited, and the area it sits under, found together.
   *
   * The area comes from the group it's drawn in rather than from a lookup on
   * the sticker, which is the same rule the pencil followed: the grouping is
   * what's on screen, and if those two ever disagreed the dropdown should open
   * on the one you can see.
   */
  const open = props.groups.flatMap((group) =>
    group.stickers
      .filter((sticker) => sticker.id === editing)
      .map((sticker) => ({ sticker, lifeAreaId: group.areaId })),
  )[0];

  /** Lit when it's what's selected, and pressing the eye again clears it. */
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
          <h2 className="font-heading text-panel-title leading-none">Your stickers</h2>
          {/* The `+` and everything behind it. The tray hands it the six areas
              it is already grouped by, rather than the form fetching them:
              they're the same six rows, and two queries for one list is how
              the dropdown and the groups end up disagreeing. */}
          {!props.local && <NewStickerForm areas={areas} />}
        </div>

        {/* The line under the heading does double duty, because a mode with no
            visible way out is a trap. While something is lit it says what, and
            offers the exit — the lit row itself is the other way out, but it
            can be scrolled off the bottom of a long rail, and this never is. */}
        <p className="mt-2 text-[0.83rem] text-ink-muted">
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
        {/* First, and not from the database: the five moods are fixed by the
            CHECK constraint on day_moods, so there is nothing to fetch.

            They sat at the bottom until recently, on the ordering "the things
            you own, then the things that come with the app". Moving them up is
            the other ordering, the one that matches how a day gets filled in:
            how it felt is the thing you always have to say, and the six areas
            below are the ones you say something about only if you did them.
            Being fixed is what makes them a good first row rather than a
            leftover — the list above the areas is the one list in the tray that
            never changes shape.

            And now literally a row. `col-span-full` so the five columns get the
            page's width in the stacked layout rather than one cell of it; in
            the rail the grid is one column and this does nothing. */}
        <MoodPicker
          className="col-span-full"
          selected={selection?.kind === "mood" ? selection.mood : null}
          onToggle={(mood) => toggle({ kind: "mood", mood })}
        />

        {props.groups.map((group) => {
          const areaSelection: Selection = {
            kind: "area",
            areaId: group.areaId,
          };

          // The rows you can still reach for. Clicking the heading above them
          // still lights the archived ones' days too, which is right: the
          // highlight is a question about the *area*, and those marks are
          // still that area's.
          const stickers = group.stickers.filter(
            (sticker) => !sticker.archived,
          );

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
              // The same form the header's `+` opens, with one field already
              // answered. Six more triggers and no second component, because
              // the only thing that differs is a value.
              action={
                props.local ? undefined : (
                  <NewStickerForm areas={areas} defaultAreaId={group.areaId} />
                )
              }
            >
              {/* An area with nothing in it was a bare label with a gap under it
                  until Step 10 — which read as something failing to load. Now
                  that the `+` works it's a state you can be in on purpose and
                  get out of, so it says so. Sits inside the <ul> as a real <li>,
                  because an empty list with a paragraph next to it is a lie a
                  screen reader repeats. */}
              {stickers.length === 0 && (
                <li className={`${TRAY_INSET} py-1 text-[0.83rem] text-ink-muted`}>
                  Nothing here yet
                </li>
              )}

              {stickers.map((sticker) => {
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
                      face: faceOf(sticker),
                    }}
                    visual={<StickerMark sticker={sticker} />}
                    name={sticker.name}
                    selected={sameSelection(selection, stickerSelection)}
                    wash={wash(sticker.colorKey)}
                    onSelect={() => toggle(stickerSelection)}
                    onActivate={
                      props.local ? undefined : () => setEditing(sticker.id)
                    }
                    // "Gym" is what the row shows; "Edit Gym" is what it does.
                    // The longer phrase still contains the visible word, which
                    // is what keeps it a legal accessible name — and what keeps
                    // "click Gym" working for someone using voice control.
                    label={props.local ? undefined : `Edit ${sticker.name}`}
                  />
                );
              })}
            </TrayGroup>
          );
        })}

        {/* Only once there is something in it. An empty "Archived (0)" fold is
            a permanent invitation to open a drawer with nothing in it. */}
        {archived.length > 0 && (
          <ArchivedGroup
            stickers={archived}
            onError={props.onError}
            className="col-span-full"
          />
        )}
      </div>

      {/* The one editor, mounted only while a sticker is open in it. Outside
          the grid, because a dialog isn't laid out — it's portaled to the end
          of the document by Radix and would otherwise be a phantom grid cell
          taking up a column. */}
      {!props.local && open && (
        <EditStickerForm
          key={open.sticker.id}
          sticker={open.sticker}
          lifeAreaId={open.lifeAreaId}
          areas={areas}
          markCount={props.markCounts.get(open.sticker.id) ?? 0}
          open
          onOpenChange={(next) => {
            if (!next) setEditing(null);
          }}
        />
      )}
    </div>
  );
}

/**
 * The fold at the bottom of the rail.
 *
 * `<details>` rather than a button and a piece of state, and it's the rare case
 * where the platform element is simply better: it opens and closes with no
 * JavaScript, it's a disclosure to a screen reader without a single ARIA
 * attribute, and browser find-in-page opens it to show you a match inside. The
 * one thing it can't do is animate, which is the thing this doesn't need.
 *
 * Closed by default. These are stickers you decided to stop seeing, and a fold
 * that remembers being open would undo that decision every time the page
 * reloaded.
 */
function ArchivedGroup(props: {
  stickers: LibrarySticker[];
  onError: (message: string) => void;
  className?: string;
}) {
  return (
    <details className={`group/fold ${props.className ?? ""}`}>
      <summary
        className={`${TRAY_INSET} eyebrow flex cursor-pointer list-none items-center gap-1.5 rounded-md py-0.5 hover:bg-ink/5`}
      >
        {/* Rotates a quarter turn when the fold opens. `list-none` above kills
            the browser's own triangle, which sits on a different baseline in
            every engine and can't be styled to match this one. */}
        <ChevronRight
          strokeWidth={1.5}
          className="size-3.5 transition-transform group-open/fold:rotate-90"
          aria-hidden="true"
        />
        Archived ({props.stickers.length})
      </summary>

      <ul className="mt-2 flex flex-col gap-0.5">
        {props.stickers.map((sticker) => (
          <ArchivedRow
            key={sticker.id}
            visual={<StickerMark sticker={sticker} />}
            name={sticker.name}
            action={
              <RestoreStickerButton
                activityId={sticker.id}
                name={sticker.name}
                onError={props.onError}
              />
            }
          />
        ))}
      </ul>
    </details>
  );
}
