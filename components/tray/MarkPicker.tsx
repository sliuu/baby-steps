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

/** [stored value, label + keywords]: the tooltip and the search text. */
type MarkEntry = readonly [mark: string, name: string];

function entriesOf(icons: readonly MarkIcon[]): readonly MarkEntry[] {
  return icons.map((icon) => [
    iconMark(icon.id),
    `${icon.label} ${icon.keywords}`,
  ]);
}

/** The eight tabs, one page each; built once at module load. */
const MARK_TABS = ICON_GROUPS.map((group) => ({
  id: group.id,
  label: group.label,
  Tab: group.Tab,
  entries: entriesOf(group.icons),
}));

/** Every mark flat, for cross-tab search. */
const ALL_MARKS: readonly MarkEntry[] = entriesOf(ALL_ICONS);

/** 9×6 = 54 = one group, so every tab is exactly one page. */
const COLUMNS = 9;
const ROWS = 6;
const PER_PAGE = COLUMNS * ROWS;

/** Every typed word appears in the mark's name. */
function matches(name: string, terms: string[]) {
  return terms.every((term) => name.includes(term));
}

type Props = {
  /** The picker closes itself afterwards. */
  onPick: (mark: string) => void;
  /** Trigger classes; the form draws it as a corner badge. */
  className?: string;
};

/** 432 icons in eight paged tabs. No scroller: hidden scrollbars and clipping hid the edge. */
export function MarkPicker(props: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  /** Null while browsing, array while searching; split inside the memo for a stable dep. */
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
        // Closing clears the search, so it never reopens mysteriously filtered.
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        {/* type="button": inside a <form> it would otherwise submit. */}
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

      {/* 9 × 1.75rem + gaps = 16.75rem, plus padding = 19rem. */}
      <PopoverContent align="start" className="w-76">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoComplete="off"
          // The total answers "is this all of them?".
          placeholder={`Search ${ALL_MARKS.length.toLocaleString()} icons`}
          aria-label="Search icons by name"
          className="h-8"
        />

        {found ? (
          // Keyed by query so a new search remounts onto page one.
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
                  // Icon-only tabs need a name: `title` for mouse, `aria-label` for SR.
                  aria-label={`${tab.label} — ${tab.entries.length}`}
                  title={`${tab.label} — ${tab.entries.length}`}
                  className="px-0"
                >
                  <tab.Tab strokeWidth={MARK_STROKE} />
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Radix mounts one panel at a time: fast open, and tab switches reset the page. */}
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

/** One page plus controls. Holds the page; unmounting is the reset. */
function Pager(props: {
  label: string;
  entries: readonly MarkEntry[];
  onPick: (mark: string) => void;
  /** Only search can be empty. */
  empty?: string;
}) {
  const [page, setPage] = useState(0);

  const pages = Math.max(1, Math.ceil(props.entries.length / PER_PAGE));
  // Clamped in case the list shrinks under a mounted pager.
  const current = Math.min(page, pages - 1);
  const slice = props.entries.slice(
    current * PER_PAGE,
    current * PER_PAGE + PER_PAGE,
  );

  if (props.entries.length === 0) {
    return (
      <p className="grid h-44.5 place-items-center px-4 text-center text-label text-ink-muted">
        {props.empty}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {/* Fixed rows/height (6 × 1.75rem + gaps) so short results don't move the controls. */}
      <div
        role="group"
        aria-label={props.label}
        className="grid h-44.5 grid-cols-9 grid-rows-6 gap-0.5"
      >
        {slice.map(([mark, name]) => {
          // Same lookup as `StickerMark`, so cell and sticker can't disagree.
          const icon = iconFor(mark);
          return (
            <button
              key={mark}
              type="button"
              // Label + keywords: icons are hard to tell apart at 16px.
              aria-label={name}
              title={name}
              onClick={() => props.onPick(mark)}
              className="grid size-7 place-items-center rounded-md text-base transition-colors hover:bg-secondary/70 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink/40"
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

        {/* Count and position: what a hidden scrollbar never said. */}
        <span className="tabular text-caption text-ink-muted">
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
