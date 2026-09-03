"use client";

import {
  ChevronLeft,
  ChevronRight,
  Coffee,
  Flag,
  Hash,
  Leaf,
  Lightbulb,
  Plane,
  Smile,
  Trophy,
  SmilePlus,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EMOJI_TABS, type EmojiEntry } from "@/lib/emoji";

/**
 * A picture for each tab, because eight words don't fit across a popover.
 *
 * Kept here rather than in `lib/emoji.ts` on the usual seam: the generated file
 * is data from Unicode, and which lucide glyph stands for "Objects" is a
 * drawing decision. Re-running the generator shouldn't be able to change the
 * icons, and picking a different icon shouldn't mean editing generated output.
 */
const TAB_ICON: Record<string, LucideIcon> = {
  smileys: Smile,
  nature: Leaf,
  food: Coffee,
  travel: Plane,
  activities: Trophy,
  objects: Lightbulb,
  symbols: Hash,
  flags: Flag,
};

/**
 * Every emoji in one list, for searching across tabs.
 *
 * Module level, so the flattening happens once when the module loads rather
 * than on every mount of every dialog. It's the same 1,914 objects the tabs
 * already hold — a second array of references, not a second copy of the data.
 */
const ALL_EMOJI: readonly EmojiEntry[] = EMOJI_TABS.flatMap((tab) => tab.emoji);

/** Nine across, six down. The grid is drawn to hold exactly this many. */
const COLUMNS = 9;
const ROWS = 6;
const PER_PAGE = COLUMNS * ROWS;

/** Matches when every word you typed appears in Unicode's name for the emoji. */
function matches(name: string, terms: string[]) {
  return terms.every((term) => name.includes(term));
}

type Props = {
  /** Called with the chosen emoji. The picker closes itself afterwards. */
  onPick: (emoji: string) => void;
};

/**
 * Every emoji Unicode defines, in eight tabs, a page at a time.
 *
 * This was forty-eight hand-picked ones until now, on the theory that a short
 * list covering the six life areas was friendlier than a wall. It wasn't — a
 * curated list is only friendly while the thing you want is in it, and the
 * moment it isn't, the field silently becomes letters-only again, because
 * typing an emoji means finding a system picker most people have never opened.
 *
 * It took two tries to show 1,914 of anything in a popover, and both failures
 * were about the *edge of the list* rather than the list:
 *
 * 1. A scrolling grid read as a couple of hundred. macOS hides its scrollbars
 *    until you are already scrolling, so a window onto a long list and a short
 *    list look identical when both are still.
 * 2. Making that grid taller made it worse. A fixed-height scroller inside a
 *    popover inside a dialog has three ancestors that can run out of room, and
 *    when one did, the list didn't scroll — it was simply cut off, with no
 *    scrollbar to say that anything had been.
 *
 * So there is no scroll container here at all. A page is 54 emoji, the grid is
 * built to hold exactly 54, and the panel is the same height whichever tab and
 * whichever page you are on — which means nothing can overflow it and there is
 * no edge to hide. What a scrollbar was failing to communicate is now a
 * sentence: "559 · 1 / 11".
 *
 * Its own file rather than more of `StickerFields`, and not for the usual
 * reason. Nothing else calls it. It moved because a paged grid behind eight
 * tabs with a search across all of them is a component in its own right, and
 * leaving it inline would have meant a form file where the emoji picker
 * outweighed the three fields it exists to collect.
 */
export function EmojiPicker(props: Props) {
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
    return ALL_EMOJI.filter(([, name]) => matches(name, terms));
  }, [query]);

  function pick(emoji: string) {
    props.onPick(emoji);
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
            submits by default, so without this, opening the emoji picker would
            post a half-filled form. */}
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Pick an emoji"
          title="Pick an emoji"
        >
          <SmilePlus strokeWidth={1.5} />
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
          placeholder={`Search ${ALL_EMOJI.length.toLocaleString()} emoji`}
          aria-label="Search emoji by name"
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
          <Tabs defaultValue={EMOJI_TABS[0].id}>
            <TabsList variant="line" className="w-full">
              {EMOJI_TABS.map((tab) => {
                const Icon = TAB_ICON[tab.id];
                return (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    // The icon is the whole trigger, so the name has to be said
                    // out loud somewhere. `title` covers the mouse, `aria-label`
                    // covers everything else — without it a screen reader reads
                    // eight unlabelled tabs.
                    aria-label={`${tab.label} — ${tab.emoji.length}`}
                    title={`${tab.label} — ${tab.emoji.length}`}
                    className="px-0"
                  >
                    <Icon strokeWidth={1.5} />
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {/* Radix mounts one panel at a time, which does two jobs here: the
                popover opens instantly because 54 buttons render rather than
                1,914, and switching tabs starts you at page one without any
                code, because the pager that held the page number is gone. */}
            {EMOJI_TABS.map((tab) => (
              <TabsContent key={tab.id} value={tab.id}>
                <Pager label={tab.label} entries={tab.emoji} onPick={pick} />
              </TabsContent>
            ))}
          </Tabs>
        )}
      </PopoverContent>
    </Popover>
  );
}

/**
 * One page of emoji, and the controls for the rest.
 *
 * Holds the page number, which is why it's a component rather than a function
 * returning JSX: unmounting it is how the page resets, and both callers above
 * lean on that instead of writing the reset out.
 */
function Pager(props: {
  label: string;
  entries: readonly EmojiEntry[];
  onPick: (emoji: string) => void;
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
      <p className="grid h-[11.125rem] place-items-center px-4 text-center text-[0.9rem] text-ink-muted">
        {props.empty}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {/* Explicit rows and an explicit height, so a half-full last page is the
          same size as a full one. Without the fixed rows the panel would shrink
          on the last page of every tab and the controls under it would jump up
          to meet the pointer that was about to click them. */}
      <div
        role="group"
        aria-label={props.label}
        className="grid h-[11.125rem] grid-cols-9 grid-rows-6 gap-0.5"
      >
        {slice.map(([emoji, name]) => (
          <button
            key={emoji}
            type="button"
            // Unicode's own name for the character. It's what makes a grid of
            // near-identical faces navigable — "grinning face with sweat" is
            // not something you can tell from "grinning squinting face" at 16
            // pixels — and it's what the search above matches on.
            aria-label={name}
            title={name}
            onClick={() => props.onPick(emoji)}
            className="grid size-7 place-items-center rounded-md text-base transition-colors hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink/40"
          >
            {emoji}
          </button>
        ))}
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
          <ChevronLeft strokeWidth={1.5} />
        </Button>

        {/* The count first, then the position. This line is the whole reason
            the scrolling version failed: "559 · 1 / 11" says how much there is
            and where you are, which is what a hidden scrollbar never did. */}
        <span className="tabular text-[0.8rem] text-ink-muted">
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
          <ChevronRight strokeWidth={1.5} />
        </Button>
      </div>
    </div>
  );
}
