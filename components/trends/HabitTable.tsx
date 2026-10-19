"use client";

import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import { useMemo, useState } from "react";

import { StickerMark } from "@/components/calendar/StickerMark";
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
import { categoryColor } from "@/lib/palette";

type Props = {
  /** From `habitTable`; shared with the phone list. */
  rows: HabitRow[];
  /** The closed window the rows were counted over. */
  window: HabitWindow;
  /** Accessible name, range included. */
  caption: string;
  today: DayString;
};

/** Columns, shared by header and body so alignment can't drift. `sort: null` = plain label. */
const COLUMNS: {
  key: string;
  label: string;
  sort: HabitSortKey | null;
  align: "left" | "right";
  /** Only the plot claims a width. */
  width?: string;
}[] = [
  { key: "habit", label: "habit", sort: null, align: "left" },
  { key: "category", label: "category", sort: "category", align: "left" },
  { key: "count", label: "marks", sort: "count", align: "right" },
  { key: "interval", label: "how often", sort: "interval", align: "left" },
  { key: "when", label: "when", sort: null, align: "left", width: "w-[28%] min-w-36" },
  { key: "last", label: "last", sort: "last", align: "right" },
];

/** Padding, alignment and the inside-only column lines. */
function cellClass(column: (typeof COLUMNS)[number], first: boolean, last: boolean): string {
  return [
    // align-middle: flex headers would otherwise take an SVG's baseline.
    "py-s1 align-middle",
    first ? "pr-s3" : "border-l border-rule-grid px-s3",
    last ? "pr-0" : "",
    column.align === "right" ? "text-right" : "",
    column.width ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}

/** Wide-screen Habits tab: every habit, sortable, filterable, paged. */
export function HabitTable(props: Props) {
  // Marks descending, same order as the phone list.
  const [sort, setSort] = useState<{
    key: HabitSortKey;
    direction: SortDirection;
  }>({ key: "count", direction: "desc" });

  // Empty = all, so a new category isn't hidden by an old selection.
  const [categories, setCategories] = useState<Set<string>>(new Set());

  const [page, setPage] = useState(1);

  const { rows } = props;

  // Categories with rows, library order.
  const options = useMemo(() => {
    const seen = new Map<string, { name: string; colorKey: string }>();
    for (const row of rows) {
      if (!seen.has(row.categoryId)) {
        seen.set(row.categoryId, { name: row.categoryName, colorKey: row.colorKey });
      }
    }
    return [...seen].map(([id, rest]) => ({ id, ...rest }));
  }, [rows]);

  const filtered = useMemo(
    () => (categories.size === 0 ? rows : rows.filter((row) => categories.has(row.categoryId))),
    [rows, categories],
  );

  const ordered = useMemo(
    () => sortHabits(filtered, sort.key, sort.direction),
    [filtered, sort],
  );

  // Clamp on read: no reset effect when a filter shrinks the pages.
  const pages = pageCount(ordered.length);
  const current = Math.min(Math.max(page, 1), pages);
  const shown = pageOf(ordered, current);

  function clickHeader(key: HabitSortKey) {
    setSort((previous) =>
      previous.key === key
        ? // Same column flips.
          { key, direction: previous.direction === "asc" ? "desc" : "asc" }
        : // New column starts at its useful end.
          { key, direction: SORT_START[key] },
    );
    setPage(1);
  }

  function toggleCategory(id: string) {
    setCategories((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      // All checked collapses to "all".
      return next.size === options.length ? new Set() : next;
    });
  }

  if (rows.length === 0) {
    return (
      <section className={`flex flex-col gap-s3 ${PANEL}`}>
        <p className="text-ink-muted">
          no habits in your tray yet. add one and it will get a row here.
        </p>
      </section>
    );
  }

  return (
    <section className={`flex min-w-0 flex-col gap-s3 ${PANEL}`}>
      {/* Only when there's a choice. */}
      {options.length > 1 && (
        <div className="flex justify-end">
          <CategoryFilter
            options={options}
            selected={categories}
            onToggle={toggleCategory}
            onClear={() => setCategories(new Set())}
          />
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-2xl border-collapse text-left">
          <caption className="sr-only">{props.caption}</caption>

          <thead>
            <tr className="border-b border-rule">
              {COLUMNS.map((column, index) => (
                <Header
                  key={column.key}
                  column={column}
                  first={index === 0}
                  last={index === COLUMNS.length - 1}
                  sort={sort}
                  onClick={clickHeader}
                />
              ))}
            </tr>
          </thead>

          <tbody>
            {shown.map((row, index) => (
              // Lines between rows only, like the calendar.
              <tr key={row.activityId} className={index > 0 ? "border-t border-rule-grid" : ""}>
                {/* Row header, so screen readers name the habit per cell. */}
                <th
                  scope="row"
                  className={`${cellClass(COLUMNS[0], true, false)} font-normal`}
                >
                  <span className="flex items-center gap-s1 text-ui text-ink lowercase">
                    <span aria-hidden="true" className="flex">
                      <StickerMark sticker={row} size="xs" />
                    </span>
                    {row.name}
                  </span>
                </th>

                <td
                  className={`${cellClass(COLUMNS[1], false, false)} text-label lowercase ${categoryColor(row.colorKey).text}`}
                >
                  {row.categoryName}
                </td>

                <td className={`${cellClass(COLUMNS[2], false, false)} tabular text-label`}>
                  {row.count === 0 ? <Nothing /> : row.count}
                </td>

                <td
                  className={`${cellClass(COLUMNS[3], false, false)} text-label whitespace-nowrap text-ink-muted lowercase`}
                >
                  {frequencyLabel(row) ?? <Nothing />}
                </td>

                <td className={cellClass(COLUMNS[4], false, false)}>
                  {/* The plot is aria-hidden; this is the fact only it shows. */}
                  <span className="sr-only">
                    {row.first ? `first on ${formatDayShort(row.first)}` : "nothing in this range"}
                  </span>
                  <BlockPlot row={row} window={props.window} />
                </td>

                <td
                  className={`${cellClass(COLUMNS[5], false, true)} tabular text-label whitespace-nowrap lowercase`}
                >
                  {row.last ? (
                    <span title={formatDayLong(row.last)}>{lastLabel(row.last, props.today)}</span>
                  ) : (
                    <Nothing />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pager page={current} pages={pages} total={ordered.length} onChange={setPage} />
    </section>
  );
}

/** Dash for "nothing here", so it doesn't read as a quantity. */
function Nothing() {
  return <span className="text-ink-muted">—</span>;
}

/** Column heading: a sort button, or a plain label. Arrow on the active column only. */
function Header(props: {
  column: (typeof COLUMNS)[number];
  first: boolean;
  last: boolean;
  sort: { key: HabitSortKey; direction: SortDirection };
  onClick: (key: HabitSortKey) => void;
}) {
  const { column, sort } = props;
  const key = column.sort;
  const cell = `${cellClass(column, props.first, props.last)} text-caption font-normal text-ink-muted`;

  if (!key) {
    return (
      <th scope="col" className={cell}>
        {column.label}
      </th>
    );
  }

  const active = sort.key === key;
  const Arrow = active && sort.direction === "asc" ? ChevronUp : ChevronDown;

  return (
    <th
      scope="col"
      aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}
      className={cell}
    >
      <button
        type="button"
        onClick={() => props.onClick(key)}
        // On the button so only the words are the hit area.
        className={`group inline-flex cursor-pointer items-center gap-1 underline-offset-4 hover:text-ink focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none ${
          active ? "text-ink underline decoration-accent-ink" : ""
        } ${column.align === "right" ? "flex-row-reverse" : ""}`}
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

/** When the marks fell, as blocks across the window. Grain from `plotGrain`. */
function BlockPlot(props: { row: HabitRow; window: HabitWindow }) {
  const { row, window: span } = props;

  const blocks = useMemo(() => plotBlocks(span, row.hits), [span, row.hits]);
  const ink = categoryColor(row.colorKey).ink;

  return (
    <span
      aria-hidden="true"
      // Column count is data, so inline style.
      className="grid h-2.5 w-full gap-0.5"
      style={{ gridTemplateColumns: `repeat(${blocks.length}, minmax(0, 1fr))` }}
    >
      {blocks.map((block) => {
        const level = blockLevel(block);
        return (
          <span
            key={block.from}
            className={level === 2 ? ink : level === 1 ? `${ink} opacity-60` : "bg-rule-grid"}
            title={blockTitle(row.name, block)}
          />
        );
      })}
    </span>
  );
}

/** Hover hint: which stretch, and what landed in it. */
function blockTitle(name: string, block: PlotBlock): string {
  const when =
    block.from === block.to
      ? formatDayShort(block.from)
      : `${formatDayShort(block.from)} — ${formatDayShort(block.to)}`;
  const what =
    block.marks === 0 ? "nothing" : `${block.marks} ${block.marks === 1 ? "mark" : "marks"}`;
  return `${name} · ${when} · ${what}`;
}

/** Category checkboxes; the menu stays open across clicks. */
function CategoryFilter(props: {
  options: { id: string; name: string; colorKey: string }[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onClear: () => void;
}) {
  const { options, selected } = props;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 lowercase">
          {filterLabel(options, selected)}
          <ChevronDown aria-hidden="true" className="size-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48 lowercase">
        {options.map((category) => (
          <DropdownMenuCheckboxItem
            key={category.id}
            // Empty selection = all checked.
            checked={selected.size === 0 || selected.has(category.id)}
            onCheckedChange={() => props.onToggle(category.id)}
            className={categoryColor(category.colorKey).text}
          >
            {category.name}
          </DropdownMenuCheckboxItem>
        ))}

        {selected.size > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={props.onClear}>show all categories</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Trigger text: the one category's name, else a count. */
function filterLabel(options: { id: string; name: string }[], selected: Set<string>): string {
  if (selected.size === 0 || selected.size === options.length) return "all categories";
  if (selected.size === 1) {
    const only = options.find((category) => selected.has(category.id));
    if (only) return only.name;
  }
  return `${selected.size} categories`;
}

/** Pager, bottom right; hidden at one page. */
function Pager(props: {
  page: number;
  pages: number;
  total: number;
  onChange: (page: number) => void;
}) {
  if (props.pages <= 1) return null;

  return (
    <div className="flex flex-wrap items-center justify-end gap-x-s3 gap-y-s1">
      {/* Announces the result of previous/next. */}
      <p aria-live="polite" className="tabular text-caption text-ink-muted">
        page {props.page} of {props.pages} · {props.total} habits
      </p>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1"
          disabled={props.page <= 1}
          onClick={() => props.onChange(props.page - 1)}
        >
          <ChevronLeft aria-hidden="true" className="size-3.5" />
          previous
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1"
          disabled={props.page >= props.pages}
          onClick={() => props.onChange(props.page + 1)}
        >
          next
          <ChevronRight aria-hidden="true" className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

/** "3 days ago" up to a month, then the date. Future days get the date. */
export function lastLabel(day: DayString, today: DayString): string {
  const ago = daysBetween(day, today);
  if (ago === 0) return "today";
  if (ago === 1) return "yesterday";
  if (ago > 1 && ago <= 30) return `${ago} days ago`;
  return formatDayShort(day);
}
