"use client";

import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { daysBetween } from "@/lib/daymath";
import { formatDayLong, formatDayShort, type DayString } from "@/lib/dates";
import {
  SORT_START,
  blockLevel,
  frequencyLabel,
  pageCount,
  pageOf,
  plotBlocks,
  sortHabits,
  type HabitRow,
  type HabitSortKey,
  type HabitWindow,
  type PlotBlock,
  type SortDirection,
} from "@/lib/habits";
import { PANEL } from "@/lib/layout";
import { ramp } from "@/lib/palette";

type Props = {
  /**
   * Every habit's row over the page's range, from `habitTable`. Counted once
   * on the page and shared with the phone's list, which draws the same rows.
   */
  rows: HabitRow[];
  /** The closed window the rows were counted over. The plot is drawn to it. */
  window: HabitWindow;
  /** The table's accessible name, range included. See `captionFor`. */
  caption: string;
  /** The visitor's today, which reads "last" as "3 days ago". */
  today: DayString;
};

/**
 * The empty part of the plot, drawn rather than left blank.
 *
 * A stretch with nothing in it still has to read as a period that happened and
 * was empty, rather than as a cell that failed to render — so every block is
 * painted and the empty ones are painted faintly. `color-mix` against `--ink`
 * rather than a fixed grey, so it flips with the theme for free: `--ink` is
 * near-black in light and near-white in dark, and 7% of either against the page
 * reads as the same faint absence.
 *
 * Lifted from the eight-week strip this plot replaced, which is the point — it
 * should look like the same drawing.
 */
const EMPTY_BLOCK = "color-mix(in srgb, var(--ink) 7%, transparent)";

/**
 * The columns, in the order they are drawn.
 *
 * **One definition for the header and the body**, which is the fix for a
 * collision rather than a tidying. They were two, and the two drifted: body
 * cells carried a right pad and headers didn't, so "Marks" ran into "How often"
 * with nothing between them. An alignment declared twice is an alignment that
 * will disagree again; `cellClass` below is the single place either row asks.
 *
 * `sort` is null for the two columns whose headers are labels rather than
 * controls. The habit is the row's own `<th scope="row">`, and what it would
 * sort into — the alphabet — is a worse order than the one it arrives in, since
 * library order already bands the table by life area. The plot is a shape rather
 * than a value: it has no single number to order by, and the two it might borrow
 * (first mark, last mark) are the "Last" column's job.
 */
const COLUMNS: {
  key: string;
  label: string;
  sort: HabitSortKey | null;
  align: "left" | "right";
  /** Only the plot claims a width: it is the one cell that wants the slack. */
  width?: string;
}[] = [
  { key: "habit", label: "Habit", sort: null, align: "left" },
  { key: "area", label: "Area", sort: "area", align: "left" },
  { key: "count", label: "Marks", sort: "count", align: "right" },
  { key: "interval", label: "How often", sort: "interval", align: "left" },
  { key: "when", label: "When", sort: null, align: "left", width: "w-[28%] min-w-36" },
  { key: "last", label: "Last", sort: "last", align: "right" },
];

/**
 * Every cell's padding and alignment, from its column's own definition.
 *
 * `align-middle` is the other half of the header fix. A table cell inherits
 * `vertical-align: baseline`, and a flex container's baseline is its first
 * item's — so the right-aligned headers, which reverse their row to put the
 * arrow on the outside, were taking their baseline from an SVG instead of from
 * the word and sat a couple of pixels above their neighbours. Centring the cells
 * sidesteps the question: nothing in this table is taller than one line, so
 * middle and baseline agree everywhere they can.
 */
function cellClass(column: (typeof COLUMNS)[number], last: boolean): string {
  return [
    "py-2 align-middle",
    last ? "" : "pr-4",
    column.align === "right" ? "text-right" : "",
    column.width ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * Every habit as a row, with a period measured against it.
 *
 * The wide screen's whole Habits tab: the panel you look something up in.
 * The phone gets `HabitList` instead, the same rows without the columns. It
 * shows *all* of your habits, including the
 * ones you did nothing of, and puts a rate beside each — the number you would
 * otherwise have to work out by counting.
 *
 * **It has no heading, and that is deliberate.** It is the only table on the tab
 * and it sits under its own rule with the range's dates printed just above it;
 * a title reading "Every habit" would be a label on the only thing it could be
 * labelling. What a reader needs at the bottom is how much more there is, which
 * is what the pager says. The accessible name the heading used to carry moved to the
 * `<caption>`, where a screen reader still gets it.
 *
 * **It follows the page's range.** It carried its own for a while, so a
 * month's ranking could sit beside a year's rates. The ranking is gone from
 * wide screens and the phone's list reads the page's range, and a second
 * dropdown that only this table obeyed was two answers to "which period is
 * this" on one page. The range is the one in the band above the tabs, shared
 * by all three.
 *
 * Three controls here, three kinds of question. The area dropdown sets *what*,
 * the headers set the order, the pager sets how much. They compose — one area,
 * by frequency, page 2 — which is why each is its own piece of state rather
 * than one "view".
 */
export function HabitTable(props: Props) {
  /**
   * Which column orders the table, and which way.
   *
   * Marks descending to start: the same order the phone's list is in, so the
   * two drawings of this tab give one answer. Every other order is a click
   * away.
   */
  const [sort, setSort] = useState<{
    key: HabitSortKey;
    direction: SortDirection;
  }>({ key: "count", direction: "desc" });

  /**
   * Which areas are shown. Empty means all of them, rather than none.
   *
   * The honest alternative is seeding the set with every area, and it goes wrong
   * the moment the library changes: a set written when you had five areas keeps
   * hiding the sixth you add later, and nothing on screen explains why. An empty
   * set has no opinion, so "all" stays true as the library moves under it.
   */
  const [areas, setAreas] = useState<Set<string>>(new Set());

  const [page, setPage] = useState(1);

  const { rows } = props;

  /** Every area with at least one row, in library order, for the dropdown. */
  const options = useMemo(() => {
    const seen = new Map<string, { name: string; colorKey: string }>();
    for (const row of rows) {
      if (!seen.has(row.areaId)) {
        seen.set(row.areaId, { name: row.areaName, colorKey: row.colorKey });
      }
    }
    return [...seen].map(([id, rest]) => ({ id, ...rest }));
  }, [rows]);

  const filtered = useMemo(
    () => (areas.size === 0 ? rows : rows.filter((row) => areas.has(row.areaId))),
    [rows, areas],
  );

  const ordered = useMemo(
    () => sortHabits(filtered, sort.key, sort.direction),
    [filtered, sort],
  );

  /**
   * The page actually shown, clamped rather than corrected.
   *
   * Filtering to one area while on page 3 leaves `page` past the end. Clamping
   * on read — here and in `pageOf`, which does the same thing — means there is
   * no effect that resets the state and no render where the table is briefly
   * empty. `page` is a request; this is the answer.
   */
  const pages = pageCount(ordered.length);
  const current = Math.min(Math.max(page, 1), pages);
  const shown = pageOf(ordered, current);

  function clickHeader(key: HabitSortKey) {
    setSort((previous) =>
      previous.key === key
        ? // The same column again flips it, which is the gesture every table
          // has taught everyone. A third click does not clear the sort: there
          // is no unsorted state to go back to that the reader asked for.
          { key, direction: previous.direction === "asc" ? "desc" : "asc" }
        : // A new column starts at its own useful end rather than ascending —
          // see `SORT_START`.
          { key, direction: SORT_START[key] },
    );
    // Page 1, because the row you were looking at is not on page 2 of a
    // different order. Unlike the filter, a re-sort has no correct page to
    // stay on.
    setPage(1);
  }

  function toggleArea(id: string) {
    setAreas((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      // Every area checked is the same table as none checked, so it collapses
      // back to the empty set — which keeps the trigger saying "All areas"
      // instead of "6 areas" for the identical view.
      return next.size === options.length ? new Set() : next;
    });
  }

  if (rows.length === 0) {
    return (
      <section className={`flex flex-col gap-4 ${PANEL}`}>
        <p className="text-ink-muted">
          No habits in your tray yet. Add one from the Calendar and it will get a
          row here.
        </p>
      </section>
    );
  }

  return (
    <section className={`flex min-w-0 flex-col gap-4 ${PANEL}`}>
      {/* Only when there is a choice to make. One area means the dropdown
          can only ever say "All areas", which is a control that does nothing.
          Right-aligned, under the range picker in the band above: the two
          filters on this tab stack in one column. */}
      {options.length > 1 && (
        <div className="flex justify-end">
          <AreaFilter
            options={options}
            selected={areas}
            onToggle={toggleArea}
            onClear={() => setAreas(new Set())}
          />
        </div>
      )}

      {/* `overflow-x-auto` for the narrow case and nothing else. Six columns of
          short strings fit a laptop comfortably; on a phone the table scrolls
          rather than wrapping a rate onto two lines. */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-2xl border-collapse text-left">
          <caption className="sr-only">
            {props.caption}
          </caption>

          <thead>
            <tr className="border-b border-hairline">
              {COLUMNS.map((column, index) => (
                <Header
                  key={column.key}
                  column={column}
                  last={index === COLUMNS.length - 1}
                  sort={sort}
                  onClick={clickHeader}
                />
              ))}
            </tr>
          </thead>

          <tbody>
            {shown.map((row) => (
              <tr key={row.activityId} className="border-b border-hairline">
                {/* The habit heads its own row, which is what lets a screen
                    reader name it again beside every number in it. */}
                <th
                  scope="row"
                  className={`${cellClass(COLUMNS[0], false)} font-normal`}
                >
                  {row.name}
                </th>

                <td className={cellClass(COLUMNS[1], false)}>
                  <span className="flex items-center gap-2.5">
                    {/* The same bare dot as `AreaBars`', in the same size —
                        the two are on two tabs and are read minutes apart, so
                        an area has to look like itself in both. */}
                    <span
                      aria-hidden="true"
                      className={`size-[9px] shrink-0 rounded-full ${ramp(row.colorKey).soft}`}
                    />
                    {row.areaName}
                  </span>
                </td>

                {/* `tabular` so the digits stop jittering as the range or the
                    order changes — the same reason `AreaBars`' numbers wear
                    it. */}
                <td className={`${cellClass(COLUMNS[2], false)} tabular`}>
                  {row.count === 0 ? <Nothing /> : row.count}
                </td>

                <td
                  className={`${cellClass(COLUMNS[3], false)} text-[0.9rem] whitespace-nowrap`}
                >
                  {frequencyLabel(row) ?? <Nothing />}
                </td>

                <td className={cellClass(COLUMNS[4], false)}>
                  {/* The plot is `aria-hidden`, so without this the column
                      would announce as an empty cell under a heading. What it
                      says is the one fact the drawing carries that no other
                      cell in the row does: where the marks start. */}
                  <span className="sr-only">
                    {row.first
                      ? `First on ${formatDayShort(row.first)}`
                      : "Nothing in this range"}
                  </span>
                  <BlockPlot row={row} window={props.window} />
                </td>

                <td
                  className={`${cellClass(COLUMNS[5], true)} tabular text-[0.9rem] whitespace-nowrap`}
                >
                  {row.last ? (
                    <span title={formatDayLong(row.last)}>
                      {lastLabel(row.last, props.today)}
                    </span>
                  ) : (
                    <Nothing />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pager
        page={current}
        pages={pages}
        total={ordered.length}
        onChange={setPage}
      />
    </section>
  );
}

/**
 * An em-dash where a number would be, for a habit with nothing in the window.
 *
 * `AreaBars`' decision, extracted because this table makes it in four columns
 * rather than two: zero is a measurement and a dash is "nothing here", and at a
 * glance the eye skips the dash instead of reading it as a quantity.
 */
function Nothing() {
  return <span className="text-ink-muted">—</span>;
}

/**
 * A column heading — a button when the column sorts, plain words when it
 * doesn't.
 *
 * The button is what makes it operable: a click handler on a `<th>` is invisible
 * to the keyboard, and "clicking the headline" has to mean tabbing to it too.
 * `aria-sort` goes on the `<th>` rather than the button because it describes the
 * *column*, and it is what makes the arrow's meaning available to someone who
 * cannot see the arrow.
 *
 * The two inert headers get no button, no arrow and no hover, rather than a
 * disabled button — which would still sit in the tab order announcing itself as
 * a control you may not use. A header that does nothing should look like a
 * label, because that is what it is.
 *
 * The arrow is only on the active column. Drawing a faint one on all four was
 * the other option and it turns the header row into a row of chevrons you have
 * to look past to read the words; `group-hover` gives it back exactly when you
 * are pointing at the thing you might click.
 */
function Header(props: {
  column: (typeof COLUMNS)[number];
  last: boolean;
  sort: { key: HabitSortKey; direction: SortDirection };
  onClick: (key: HabitSortKey) => void;
}) {
  const { column, sort } = props;
  const key = column.sort;
  const cell = `${cellClass(column, props.last)} font-normal`;

  if (!key) {
    return (
      <th scope="col" className={`eyebrow ${cell}`}>
        {column.label}
      </th>
    );
  }

  const active = sort.key === key;
  const Arrow = active && sort.direction === "asc" ? ChevronUp : ChevronDown;

  return (
    <th
      scope="col"
      aria-sort={
        active ? (sort.direction === "asc" ? "ascending" : "descending") : "none"
      }
      className={cell}
    >
      <button
        type="button"
        onClick={() => props.onClick(key)}
        // `eyebrow` on the button rather than the cell, so the hit area is the
        // words and not the whole column's width — a header you can click
        // three centimetres to the right of reads as an accident.
        className={`eyebrow group inline-flex cursor-pointer items-center gap-1 rounded-sm hover:text-ink focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none ${
          column.align === "right" ? "flex-row-reverse" : ""
        }`}
      >
        {column.label}
        <Arrow
          aria-hidden="true"
          className={`size-3 transition-opacity ${
            active ? "opacity-100" : "opacity-0 group-hover:opacity-40"
          }`}
        />
      </button>
    </th>
  );
}

/**
 * When the marks fell, as blocks along the window.
 *
 * **The same drawing as the eight-week strip this tab used to carry**, which is
 * why the strip could go: discrete blocks with gutters between them, an empty
 * one drawn faintly, a heavy one for a stretch you did more of than not. What
 * was here before was a row of 2px ticks at positions computed from the data —
 * a finer picture and the wrong one. Ticks say *when* precisely and nothing
 * about how much, they are too narrow to point at, and at a year's worth they
 * pile into a smear. Blocks lose the exact day, which the last column names
 * anyway, and gain a shape you can compare against the row above.
 *
 * How long a block is comes from the window: a day each up to a month, a week
 * each up to a year, then months, then years. See `plotGrain` — the rule is that
 * the number of blocks stays in the range the eye can still count.
 *
 * The block *widths* stretch where the strip's were fixed pixels, and that is
 * the one thing that had to change. The strip's cells had to line up with the
 * cells in the row above across a dozen independently rendered rows, so they
 * could not move; these are cells of one table column, where every row is
 * already the same width and a fraction lines them up for free.
 *
 * `aria-hidden`, with the strip's justification and a stronger version of it:
 * every fact in here is also in the row it sits in — the count two cells left,
 * the last day one cell right, the first in the `sr-only` beside it — so a
 * screen reader loses the shape and keeps everything else.
 */
function BlockPlot(props: { row: HabitRow; window: HabitWindow }) {
  const { row, window: span } = props;

  const blocks = useMemo(() => plotBlocks(span, row.hits), [span, row.hits]);
  const tint = ramp(row.colorKey);

  return (
    <span
      aria-hidden="true"
      // `gap-0.5` is the strip's 2px gutter, and it is what keeps a run of good
      // days looking like a run rather than one solid bar. The column count is
      // data-driven, so the template has to be an inline style: Tailwind reads
      // the source text, it never runs it.
      className="grid h-2.5 w-full gap-0.5"
      style={{ gridTemplateColumns: `repeat(${blocks.length}, minmax(0, 1fr))` }}
    >
      {blocks.map((block) => {
        const level = blockLevel(block);
        return (
          <span
            key={block.from}
            className={level === 2 ? tint.bg : level === 1 ? tint.soft : ""}
            style={level === 0 ? { backgroundColor: EMPTY_BLOCK } : undefined}
            // Native `title`, matching the strip's per-cell hint and the four
            // other hover details in the app. A tooltip component would be a
            // new dependency on the page for a hint on a 6px block.
            title={blockTitle(row.name, block)}
          />
        );
      })}
    </span>
  );
}

/**
 * The hover hint on a block: which stretch, and what landed in it.
 *
 * A single-day block names the day and stops — "13 Sep — 13 Sep" is a range of
 * one and reads as a mistake.
 */
function blockTitle(name: string, block: PlotBlock): string {
  const when =
    block.from === block.to
      ? formatDayShort(block.from)
      : `${formatDayShort(block.from)} — ${formatDayShort(block.to)}`;
  const what =
    block.marks === 0
      ? "nothing"
      : `${block.marks} ${block.marks === 1 ? "mark" : "marks"}`;
  return `${name} · ${when} · ${what}`;
}

/**
 * Which areas to show, as checkboxes.
 *
 * A menu of checkboxes rather than a `Select`, because this is the one control
 * on the panel whose answer can be several things at once — and the two look
 * different on purpose: the range picker is a `Select` because a range is
 * exactly one choice. Radix's `DropdownMenuCheckboxItem` keeps the menu open
 * across a click, which is what makes picking three areas one gesture.
 */
function AreaFilter(props: {
  options: { id: string; name: string; colorKey: string }[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onClear: () => void;
}) {
  const { options, selected } = props;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* `font-normal`, matching the range picker's custom-range button. A
            filter is a thing you read, not a thing that shouts. */}
        {/* `rounded-sm` over the size variant's own corner: this sits a line
            under the range picker, and the two dropdowns on the tab have to
            turn the same one. See `CONTROL_RADIUS`. */}
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 rounded-sm font-normal"
        >
          {filterLabel(options, selected)}
          <ChevronDown aria-hidden="true" className="size-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48">
        {options.map((area) => (
          <DropdownMenuCheckboxItem
            key={area.id}
            // An empty selection means all of them, so every box reads as
            // checked — which is what the table is showing. See the state's
            // note for why "all" isn't stored as a full set.
            checked={selected.size === 0 || selected.has(area.id)}
            onCheckedChange={() => props.onToggle(area.id)}
          >
            <span
              aria-hidden="true"
              className={`size-2.5 shrink-0 rounded-full ${ramp(area.colorKey).soft}`}
            />
            {area.name}
          </DropdownMenuCheckboxItem>
        ))}

        {selected.size > 0 && (
          <>
            <DropdownMenuSeparator />
            {/* The way back, in one click. Unchecking your way back to all six
                is five clicks to return to where you started. */}
            <DropdownMenuItem onSelect={props.onClear}>
              Show all areas
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * What the filter's trigger says.
 *
 * Names the area when there is one, because a filter that has been applied
 * should say what it was set to — the same rule the custom range's button
 * follows. Past one it counts them: three area names on a button is wider than
 * the column it is filtering.
 */
function filterLabel(
  options: { id: string; name: string }[],
  selected: Set<string>,
): string {
  if (selected.size === 0 || selected.size === options.length) return "All areas";
  if (selected.size === 1) {
    const only = options.find((area) => selected.has(area.id));
    if (only) return only.name;
  }
  return `${selected.size} areas`;
}

/**
 * The pager, bottom right, or nothing at all when everything fits.
 *
 * **It is the panel's size label now that the heading is gone.** "Page 1 of 2"
 * is the one line that says how much there is, which is why it leads with the
 * page count rather than the row range it used to print: a reader looking at ten
 * rows already knows they can see ten rows, and what they cannot tell is whether
 * that is all of them. The total rides along after it, because "13 habits" is
 * what makes page 2 worth pressing.
 *
 * Hidden rather than disabled at one page. A pager greyed out under a table of
 * four rows is furniture explaining a limit you haven't reached; the control
 * appearing when the table outgrows a page is the same information, given at the
 * moment it means something.
 *
 * Everything sits at the right-hand end — where a pager goes, where this one was
 * asked to be, and the end of the reading. It is the only control on the panel
 * that belongs after the table rather than before it.
 */
function Pager(props: {
  page: number;
  pages: number;
  total: number;
  onChange: (page: number) => void;
}) {
  if (props.pages <= 1) return null;

  return (
    <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
      <p
        // The numbers change when a button is pressed and the buttons say only
        // "previous" and "next", so without this a screen reader hears the
        // click and never the result.
        aria-live="polite"
        className="tabular text-[0.83rem] text-ink-muted"
      >
        Page {props.page} of {props.pages} · {props.total} habits
      </p>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 font-normal"
          disabled={props.page <= 1}
          onClick={() => props.onChange(props.page - 1)}
        >
          <ChevronLeft aria-hidden="true" className="size-3.5" />
          Previous
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 font-normal"
          disabled={props.page >= props.pages}
          onClick={() => props.onChange(props.page + 1)}
        >
          Next
          <ChevronRight aria-hidden="true" className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

/**
 * How long ago the last mark was, in the words you'd use out loud.
 *
 * "3 days ago" rather than "9 Sep", because the question this column answers is
 * whether you have let something slide — and that is a subtraction the reader
 * should not have to do against a date they have to find today on a calendar to
 * place. The full date is on the cell's `title` for when the exact day matters.
 *
 * It switches to a date at a month out, where the relative form stops helping:
 * "47 days ago" is a number you have to convert back, and by then *which* day it
 * was has become the more useful fact. The year is never printed — inside a
 * range you chose, the year is not in question.
 *
 * A future day is possible, in a custom range that runs past today, and it gets
 * its date rather than "-5 days ago".
 */
export function lastLabel(day: DayString, today: DayString): string {
  const ago = daysBetween(day, today);
  if (ago === 0) return "Today";
  if (ago === 1) return "Yesterday";
  if (ago > 1 && ago <= 30) return `${ago} days ago`;
  return formatDayShort(day);
}
