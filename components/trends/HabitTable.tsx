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
  HABITS_PER_PAGE,
  SORT_START,
  frequencyLabel,
  pageCount,
  pageOf,
  sortHabits,
  type HabitRow,
  type HabitSortKey,
  type HabitWindow,
  type SortDirection,
} from "@/lib/habits";
import { PANEL } from "@/lib/layout";
import { ramp } from "@/lib/palette";

type Props = {
  /** Every habit with the range measured against it, in library order. */
  rows: HabitRow[];
  /** The closed window the rows were counted over. The plot's axis. */
  window: HabitWindow;
  /** The range as an adverbial, for the heading. From `rangePhrase`. */
  phrase: string;
  /** The visitor's today, for reading "last done" as "3 days ago". */
  today: DayString;
  /** The table's accessible name. See `AreaTable`'s note on the same prop. */
  caption: string;
};

/**
 * The plot's tick, in pixels, and the number of slots it is snapped to.
 *
 * Pixels for the tick because it is the one thing here that must not scale: a
 * mark has to be visible and it has to be narrow, and 2px is the width at which
 * a vertical line still reads as a tick rather than a bar. The track itself is a
 * percentage and stretches with the column, which is the opposite of
 * `HabitHeatmap`'s fixed pitch — and the difference is the point. The strip's
 * cells have to line up with the cells in the row above, so they cannot move;
 * these ticks are only ever read against the other ticks in their own row.
 *
 * `SLOTS` is what keeps that honest across ranges. At 30 days a plot has one
 * tick per day and you can count them; at 365 days there could be three hundred
 * ticks in 200px, which is a solid block that says nothing. Snapping to 72 slots
 * turns the long ranges into a density — clusters and gaps — and leaves the
 * short ones untouched, since 72 slots is more than a month has days.
 *
 * 72 rather than a number derived from the column's width, because the column's
 * width is not knowable here: measuring it would mean an effect, a resize
 * observer and a re-render per drag. 72 is a little denser than the narrowest
 * this column gets, which is the error worth having — slightly overlapping ticks
 * at 8rem, exact ones everywhere wider.
 */
const TICK = 2;
const SLOTS = 72;

/**
 * Which columns the header can sort, in the order they are drawn.
 *
 * The habit is not in here and that is the one deliberate omission: it is the
 * row's own label, a `<th scope="row">` the way `AreaTable`'s area is, and what
 * it sorts into — the alphabet — is a worse order than the one it arrives in.
 * Library order groups the table by life area, so the unsorted table is already
 * banded by colour.
 *
 * `align` travels with the definition rather than being spelled at each cell,
 * because a header that right-aligns over a left-aligned column is the classic
 * way a table stops reading as columns.
 */
const COLUMNS: {
  key: HabitSortKey;
  label: string;
  align: "left" | "right";
  /** Only the plot claims a width: it is the one cell that wants the slack. */
  width?: string;
}[] = [
  { key: "area", label: "Area", align: "left" },
  { key: "count", label: "Marks", align: "right" },
  { key: "interval", label: "How often", align: "left" },
  { key: "first", label: "When", align: "left", width: "w-[30%] min-w-32" },
  { key: "last", label: "Last", align: "right" },
];

/**
 * Every habit as a row, with the range measured against it.
 *
 * The third panel on this tab and the one that answers the questions the other
 * two can't. `MostDone` ranks by count and shows eight; `HabitHeatmap` draws
 * every day of a fixed eight weeks and ignores the range entirely. This one
 * takes the range seriously, shows *all* of your habits including the ones you
 * did nothing of, and puts a rate beside each — which is the number you would
 * otherwise have to work out by counting squares.
 *
 * **It overlaps both of its neighbours, on purpose.** The count is in `MostDone`
 * and the ticks are a coarser version of the strip. What is new is the
 * combination: a rate, a last-done, and a row per habit rather than per top
 * eight — read down the page rather than across one week. The two drawings above
 * are for noticing; this is for looking something up.
 *
 * Four controls, and each one is a different kind of question. The range picker
 * up the page sets *when* (it is shared with every other panel, so it is not
 * repeated here); the area dropdown sets *what*; the headers set the order; the
 * pager sets how much. They compose — filtering to one area while sorted by
 * frequency on page 2 is a coherent thing to be looking at — which is why the
 * sort and the filter are separate pieces of state rather than one "view".
 */
export function HabitTable(props: Props) {
  const { rows, window: span } = props;

  /**
   * Which column orders the table, and which way.
   *
   * Marks descending to start: the table's first reading should be the same one
   * the ranking beside it gives, so that landing on the tab and then finding
   * this panel doesn't feel like two different answers. Every other order is a
   * click away.
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
  const last = pageCount(ordered.length);
  const current = Math.min(Math.max(page, 1), last);
  const shown = pageOf(ordered, current);

  if (rows.length === 0) {
    return (
      <section className={`flex flex-col gap-4 ${PANEL}`}>
        <h2 className="eyebrow">Every habit</h2>
        <p className="text-ink-muted">
          No habits in your tray yet. Add one from the Habits tab and it will
          get a row here.
        </p>
      </section>
    );
  }

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

  return (
    <section className={`flex min-w-0 flex-col gap-4 ${PANEL}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          {/* `eyebrow`, matching the two panels above it rather than being a
              louder heading for being the wider one. */}
          <h2 className="eyebrow">Every habit, {props.phrase}</h2>
          <p className="tabular text-[0.83rem] text-ink-muted">
            {formatDayShort(span.from)} — {formatDayShort(span.to)}
          </p>
        </div>

        {/* Only when there is a choice to make. One area means the dropdown
            can only ever say "All areas", which is a control that does
            nothing. */}
        {options.length > 1 && (
          <AreaFilter
            options={options}
            selected={areas}
            onToggle={toggleArea}
            onClear={() => setAreas(new Set())}
          />
        )}
      </div>

      {/* `overflow-x-auto` for the narrow case and nothing else. Six columns of
          short strings fit a laptop comfortably; on a phone the table scrolls
          rather than wrapping a rate onto two lines, which is the same call
          `HabitHeatmap` makes one panel up. */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-2xl border-collapse text-left">
          <caption className="sr-only">{props.caption}</caption>

          <thead>
            <tr className="border-b border-hairline">
              <th scope="col" className="eyebrow py-2 font-normal">
                Habit
              </th>
              {COLUMNS.map((column) => (
                <SortHeader
                  key={column.key}
                  column={column}
                  sort={sort}
                  onClick={() => clickHeader(column.key)}
                />
              ))}
            </tr>
          </thead>

          <tbody>
            {shown.map((row) => (
              <tr key={row.activityId} className="border-b border-hairline">
                {/* The habit heads its own row, which is what lets a screen
                    reader name it again beside every number in it. */}
                <th scope="row" className="py-2 pr-4 font-normal">
                  {row.name}
                </th>

                <td className="py-2 pr-4">
                  <span className="flex items-center gap-2.5">
                    {/* The same bare dot as `AreaTable`'s, in the same size —
                        the two tables are on two tabs and are read minutes
                        apart, so an area has to look like itself in both. */}
                    <span
                      aria-hidden="true"
                      className={`size-2.5 shrink-0 rounded-full ${ramp(row.colorKey).soft}`}
                    />
                    {row.areaName}
                  </span>
                </td>

                {/* `tabular` so the digits stop jittering as the range or the
                    order changes — the same reason `AreaTable`'s numbers wear
                    it. */}
                <td className="tabular py-2 pr-4 text-right">
                  {row.count === 0 ? <Nothing /> : row.count}
                </td>

                <td className="py-2 pr-4 text-[0.9rem] whitespace-nowrap">
                  {frequencyLabel(row) ?? <Nothing />}
                </td>

                <td className="py-2 pr-4">
                  {/* The plot itself is `aria-hidden`, so without this the
                      column would announce as an empty cell under a heading.
                      The fact the drawing carries that the other cells don't is
                      where the marks *start*, which is also what this column
                      sorts by — so the sentence and the header agree. */}
                  <span className="sr-only">
                    {row.first
                      ? `First on ${formatDayShort(row.first)}`
                      : "Nothing in this range"}
                  </span>
                  <TickPlot row={row} window={span} />
                </td>

                <td className="tabular py-2 text-right text-[0.9rem] whitespace-nowrap">
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
        pages={last}
        total={ordered.length}
        onChange={setPage}
      />
    </section>
  );
}

/**
 * An em-dash where a number would be, for a habit with nothing in the window.
 *
 * `AreaTable`'s decision, extracted because this table makes it in four columns
 * rather than two: zero is a measurement and a dash is "nothing here", and at a
 * glance the eye skips the dash instead of reading it as a quantity.
 */
function Nothing() {
  return <span className="text-ink-muted">—</span>;
}

/**
 * A sortable column heading: a button in a `<th>`, with `aria-sort` on the cell.
 *
 * The button is what makes it operable — a click handler on a `<th>` is
 * invisible to the keyboard, and "clicking the headline" has to mean tabbing to
 * it too. `aria-sort` goes on the `<th>` rather than the button because it
 * describes the *column*, and it is the attribute that makes the arrow's
 * meaning available to someone who cannot see the arrow.
 *
 * The arrow is only on the active column. Drawing a faint one on all five was
 * the other option and it turns the header row into a row of chevrons you have
 * to look past to read the words; `group-hover` gives it back exactly when you
 * are pointing at the thing you might click.
 */
function SortHeader(props: {
  column: (typeof COLUMNS)[number];
  sort: { key: HabitSortKey; direction: SortDirection };
  onClick: () => void;
}) {
  const { column, sort } = props;
  const active = sort.key === column.key;
  const Arrow = active && sort.direction === "asc" ? ChevronUp : ChevronDown;

  return (
    <th
      scope="col"
      aria-sort={
        active ? (sort.direction === "asc" ? "ascending" : "descending") : "none"
      }
      // The width is declared once, on the header, rather than on ten identical
      // body cells that the browser then has to reconcile.
      className={`py-2 font-normal ${column.width ?? ""} ${
        column.align === "right" ? "text-right" : ""
      }`}
    >
      <button
        type="button"
        onClick={props.onClick}
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
 * When the marks fell, as ticks along the window.
 *
 * The column the strip above can't be: it is per-row and it stretches, so it
 * says *shape* — front-loaded, evenly spread, three clusters and a gap — for
 * whatever span the picker is on, including a year. What it deliberately does
 * not say is which day; that is the calendar's job, and the last column names
 * the one day this panel is prepared to be precise about.
 *
 * A one-day window is drawn as a single tick at the left rather than divided by
 * zero. `hits` holds offsets, and the only offset in a one-day window is 0.
 *
 * `aria-hidden`, with `HabitHeatmap`'s justification and a stronger version of
 * it: every fact in here is also in the row it sits in — the count is two cells
 * left and the last day is one cell right — so a screen reader loses position
 * and keeps everything else.
 */
function TickPlot(props: { row: HabitRow; window: HabitWindow }) {
  const { row, window: span } = props;
  const divisor = Math.max(span.days - 1, 1);

  /**
   * One tick per slot, so a year of daily marks is a texture rather than a
   * solid block of overlapping 2px lines. See `SLOTS`.
   */
  const slots = useMemo(() => {
    const set = new Set<number>();
    for (const hit of row.hits) {
      set.add(Math.round((hit / divisor) * (SLOTS - 1)));
    }
    return [...set];
  }, [row.hits, divisor]);

  return (
    <span
      aria-hidden="true"
      // The track is a hairline through the middle rather than an empty box:
      // with nothing drawn on it, a row with no marks still reads as a period
      // that happened and was empty. `HabitHeatmap` spends a repeating gradient
      // on the same idea; at this density one line is the whole picture.
      className="relative block h-3.5 w-full before:absolute before:inset-x-0 before:top-1/2 before:h-px before:bg-hairline before:content-['']"
    >
      {slots.map((slot) => (
        <span
          key={slot}
          // Inline, because Tailwind reads the source text and never runs it —
          // a position computed from the data cannot be a class. The
          // `100% - TICK` is what keeps the last tick inside the track instead
          // of hanging 2px past its right edge.
          style={{
            left: `calc(${slot / (SLOTS - 1)} * (100% - ${TICK}px))`,
            width: TICK,
          }}
          className={`absolute inset-y-0 rounded-full ${ramp(row.colorKey).bg}`}
        />
      ))}
    </span>
  );
}

/**
 * Which areas to show, as checkboxes.
 *
 * A menu of checkboxes rather than a `Select`, because this is the one control
 * on the page whose answer can be several things at once — and the two look
 * different on purpose: the range picker up the page is a `Select` because a
 * range is exactly one choice. Radix's `DropdownMenuCheckboxItem` keeps the menu
 * open across a click, which is what makes picking three areas one gesture.
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
        <Button variant="outline" size="sm" className="gap-1.5 font-normal">
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
 * The pager, or nothing at all when everything fits.
 *
 * Hidden rather than disabled at one page. A pager greyed out under a table of
 * four rows is furniture explaining a limit you haven't reached; the control
 * appearing when the table outgrows the screen is the same information, given
 * at the moment it means something.
 *
 * It says the range and the total rather than "Page 2 of 3", because the
 * question a reader has here is "how many habits are there" — the page number
 * is only interesting as a way of getting to the rest.
 */
function Pager(props: {
  page: number;
  pages: number;
  total: number;
  onChange: (page: number) => void;
}) {
  if (props.pages <= 1) return null;

  const from = (props.page - 1) * HABITS_PER_PAGE + 1;
  const to = Math.min(props.page * HABITS_PER_PAGE, props.total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
      <p
        // The numbers change when a button is pressed and the buttons say only
        // "previous" and "next", so without this a screen reader hears the
        // click and never the result.
        aria-live="polite"
        className="tabular text-[0.83rem] text-ink-muted"
      >
        {from}–{to} of {props.total}
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
function lastLabel(day: DayString, today: DayString): string {
  const ago = daysBetween(day, today);
  if (ago === 0) return "Today";
  if (ago === 1) return "Yesterday";
  if (ago > 1 && ago <= 30) return `${ago} days ago`;
  return formatDayShort(day);
}
