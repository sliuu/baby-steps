"use client";

import { ChevronLeft, ChevronRight, SmilePlus } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ALL_ICONS,
  ICON_GROUPS,
  MARK_ICON_SIZE,
  MARK_STROKE,
  iconFor,
  iconMark,
  type MarkIcon,
} from "@/lib/icons";

/**
 * One cell of the grid: the string that gets stored, and the words that find it.
 *
 * A tuple rather than the `MarkIcon` object it comes from, because the grid
 * only ever needs those two things and searching a flat string is the whole of
 * `matches`. The first element is what lands in the database — `icon:dumbbell`
 * — and the second is the icon's label followed by its keywords, which is both
 * what the tooltip says and what the search reads.
 */
type MarkEntry = readonly [mark: string, name: string];

/** One group's icons, as the grid wants them. */
function entriesOf(icons: readonly MarkIcon[]): readonly MarkEntry[] {
  return icons.map((icon) => [
    iconMark(icon.id),
    `${icon.label} ${icon.keywords}`,
  ]);
}

/**
 * The eight tabs, in `lib/icons.ts`'s order, each exactly one page.
 *
 * Assembled once at module load rather than per mount: the popover opens on a
 * click and there is no reason for it to build 432 tuples first.
 */
const MARK_TABS = ICON_GROUPS.map((group) => ({
  id: group.id,
  label: group.label,
  Tab: group.Tab,
  entries: entriesOf(group.icons),
}));

/**
 * Every mark in one list, for searching across tabs.
 *
 * Module level, so the flattening happens once when the module loads rather
 * than on every mount of every dialog.
 */
const ALL_MARKS: readonly MarkEntry[] = entriesOf(ALL_ICONS);

/**
 * Nine across, six down — and fifty-four is also the size of a group, which is
 * the arrangement this picker is built around rather than a coincidence. Every
 * tab is exactly one full page: nothing to page through while browsing, no
 * half-empty last row, and the pager below only ever earns its keep on a
 * search. See `IconGroup` in `lib/icons.ts`.
 */
const COLUMNS = 9;
const ROWS = 6;
const PER_PAGE = COLUMNS * ROWS;

/** Matches when every word you typed appears in the mark's name. */
function matches(name: string, terms: string[]) {
  return terms.every((term) => name.includes(term));
}

type Props = {
  /** Called with the chosen mark. The picker closes itself afterwards. */
  onPick: (mark: string) => void;
  /**
   * Classes for the trigger button. The form draws it as a badge on the corner
   * of the mark circle rather than as a button in a row, and where a control
   * sits is the caller's business — the popover under it is the same either way.
   */
  className?: string;
};

/**
 * Four hundred and thirty-two icons in eight tabs, a page at a time.
 *
 * It offered every emoji Unicode defines until now, in eight tabs behind a
 * short list of icons, and the wall of faces is gone. The reasoning is in
 * `lib/icons.ts`: an emoji picked from that wall looked like nothing else in
 * the app, and having it there taught that the icon tab was the short list
 * rather than the vocabulary. Growing the set to 432 is what paid for closing
 * it. A mark can still be a typed letter, and every emoji already in a
 * database still draws — see `StickerMark`.
 *
 * There is no scroll container here, and that survives from the emoji version
 * for a reason worth keeping. Two attempts at showing a long list in a popover
 * failed, and both failed at the *edge* of the list rather than the list:
 *
 * 1. A scrolling grid read as a couple of hundred. macOS hides its scrollbars
 *    until you are already scrolling, so a window onto a long list and a short
 *    list look identical when both are still.
 * 2. Making that grid taller made it worse. A fixed-height scroller inside a
 *    popover inside a dialog has three ancestors that can run out of room, and
 *    when one did, the list didn't scroll — it was simply cut off, with no
 *    scrollbar to say that anything had been.
 *
 * So a page is fifty-four marks, the grid is built to hold exactly fifty-four,
 * and the panel is the same height whichever tab and whichever page you are on
 * — which means nothing can overflow it and there is no edge to hide. What a
 * scrollbar was failing to communicate is a sentence instead: "54 · 1 / 1".
 *
 * Its own file rather than more of `StickerFields`, and not for the usual
 * reason. Nothing else calls it. It moved because a paged grid behind eight tabs
 * with a search across all of them is a component in its own right, and leaving
 * it inline would have meant a form file where the picker outweighed the three
 * fields it exists to collect.
 */
export function MarkPicker(props: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  /**
   * Null while browsing, an array while searching — and the difference is what
   * the panel below switches on, rather than a second piece of state saying
   * which mode we're in. One value, one source of truth.
   *
   * The terms are split inside the memo rather than outside it on purpose: a
   * fresh array on every render would be useless as a dependency, and the
   * string it came from is the real input anyway.
   */
  const found = useMemo(() => {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return null;
    return ALL_MARKS.filter(([, name]) => matches(name, terms));
  }, [query]);

  function pick(mark: string) {
    props.onPick(mark);
    setOpen(false);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // Closing clears the search. Reopening onto last time's query would
        // show a filtered picker with no obvious reason for being filtered —
        // the same "reopened onto stale state" the dialogs avoid by unmounting.
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        {/* type="button", and it is load-bearing. A <button> inside a <form>
            submits by default, so without this, opening the picker would post a
            half-filled form. */}
        <Button
          type="button"
          variant="outline"
          size="icon-xs"
          aria-label="Pick a mark"
          title="Pick a mark"
          className={props.className}
        >
          <SmilePlus strokeWidth={MARK_STROKE} />
        </Button>
      </PopoverTrigger>

      {/* Nine columns of 1.75rem plus their gaps is 16.75rem, and 19rem is that
          with the popover's own padding either side. The width is derived from
          the grid rather than chosen and then filled, so the panel has no slack
          in it to explain. */}
      <PopoverContent align="start" className="w-[19rem]">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoComplete="off"
          // The total, said out loud, in the one place nobody can miss it. It
          // is the honest answer to "is this all of them?" and it costs a
          // placeholder.
          placeholder={`Search ${ALL_MARKS.length.toLocaleString()} icons`}
          aria-label="Search icons by name"
          className="h-8"
        />

        {found ? (
          // Keyed by the query, so a new search starts on page one. Remounting
          // is the reset — the same trick the dialogs use, and cheaper than an
          // effect watching the query to push the page back to zero.
          <Pager
            key={query}
            label={`Results for ${query.trim()}`}
            entries={found}
            onPick={pick}
            empty={`Nothing matches “${query.trim()}”.`}
          />
        ) : (
          <Tabs defaultValue={MARK_TABS[0].id}>
            <TabsList variant="line" className="w-full">
              {MARK_TABS.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  // The icon is the whole trigger, so the name has to be said
                  // out loud somewhere. `title` covers the mouse, `aria-label`
                  // covers everything else — without it a screen reader reads
                  // eight unlabelled tabs.
                  aria-label={`${tab.label} — ${tab.entries.length}`}
                  title={`${tab.label} — ${tab.entries.length}`}
                  className="px-0"
                >
                  <tab.Tab strokeWidth={MARK_STROKE} />
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Radix mounts one panel at a time, which does two jobs here: the
                popover opens instantly because 54 buttons render rather than
                432, and switching tabs starts you at page one without any code,
                because the pager that held the page number is gone. */}
            {MARK_TABS.map((tab) => (
              <TabsContent key={tab.id} value={tab.id}>
                <Pager label={tab.label} entries={tab.entries} onPick={pick} />
              </TabsContent>
            ))}
          </Tabs>
        )}
      </PopoverContent>
    </Popover>
  );
}

/**
 * One page of marks, and the controls for the rest.
 *
 * Holds the page number, which is why it's a component rather than a function
 * returning JSX: unmounting it is how the page resets, and both callers above
 * lean on that instead of writing the reset out.
 */
function Pager(props: {
  label: string;
  entries: readonly MarkEntry[];
  onPick: (mark: string) => void;
  /** Shown instead of the grid when there's nothing. Only search can be empty. */
  empty?: string;
}) {
  const [page, setPage] = useState(0);

  const pages = Math.max(1, Math.ceil(props.entries.length / PER_PAGE));
  // Clamped rather than trusted. Nothing here can currently shrink the list
  // under a mounted pager, but a page number that outlives its list renders a
  // blank grid, and one line is cheaper than the rule that it can't happen.
  const current = Math.min(page, pages - 1);
  const slice = props.entries.slice(
    current * PER_PAGE,
    current * PER_PAGE + PER_PAGE,
  );

  if (props.entries.length === 0) {
    return (
      <p className="grid h-[11.125rem] place-items-center px-4 text-center text-[0.83rem] text-ink-muted">
        {props.empty}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {/* Explicit rows and an explicit height, so a half-full search page is
          the same size as a full one. Six rows of 1.75rem plus five 0.125rem
          gaps is 11.125rem. Without the fixed rows the panel would shrink on a
          short result set and the controls under it would jump up to meet the
          pointer that was about to click them. */}
      <div
        role="group"
        aria-label={props.label}
        className="grid h-[11.125rem] grid-cols-9 grid-rows-6 gap-0.5"
      >
        {slice.map(([mark, name]) => {
          // The one cell that turns a stored string into a picture, and it asks
          // the same function `StickerMark` asks. A cell drawing an icon and a
          // sticker drawing that icon cannot disagree, because there is one
          // lookup and one pair of size and stroke constants between them.
          const icon = iconFor(mark);
          return (
            <button
              key={mark}
              type="button"
              // The icon's label and its keywords. It's what makes a grid of
              // 1px line drawings navigable — a pot and a chef's hat are not
              // something you can tell apart at 16 pixels — and it's what the
              // search above matches on.
              aria-label={name}
              title={name}
              onClick={() => props.onPick(mark)}
              className="grid size-7 place-items-center rounded-md text-base transition-colors hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink/40"
            >
              {icon ? (
                <icon.Icon
                  className={MARK_ICON_SIZE}
                  strokeWidth={MARK_STROKE}
                />
              ) : (
                mark
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Previous page"
          disabled={current === 0}
          onClick={() => setPage(current - 1)}
        >
          <ChevronLeft strokeWidth={MARK_STROKE} />
        </Button>

        {/* The count first, then the position. This line is the whole reason
            the scrolling version failed: "36 · 1 / 1" says how much there is
            and where you are, which is what a hidden scrollbar never did. */}
        <span className="tabular text-[0.735rem] text-ink-muted">
          {props.entries.length.toLocaleString()} · {current + 1} / {pages}
        </span>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Next page"
          disabled={current === pages - 1}
          onClick={() => setPage(current + 1)}
        >
          <ChevronRight strokeWidth={MARK_STROKE} />
        </Button>
      </div>
    </div>
  );
}
