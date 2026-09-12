"use client";

import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RANGE_KINDS,
  RANGE_LABEL,
  type Range,
  type RangeKind,
} from "@/lib/analytics";
import {
  formatDayShort,
  fromDayString,
  toDayString,
  type DayString,
} from "@/lib/dates";

type Props = {
  value: Range;
  onChange: (range: Range) => void;
};

/**
 * A dropdown, not a segmented pill.
 *
 * The pill was the other option, and it lost to a chart switcher that has since
 * been deleted: Step 14 put a genuine segmented pill for Life Star / Pie / Bars
 * directly below this control, and two pills stacked on each other are two
 * controls of equal weight competing to look like the important one.
 *
 * The switcher is gone and the argument survives it, which is why this is still
 * a dropdown. This control governs every number on the page above the strip,
 * and it does so quietly — a loud pill for a filter would out-shout the panels
 * it filters. What changed is only that it is now the sole control up there.
 */
export function RangePicker(props: Props) {
  const { value, onChange } = props;

  /**
   * Switching *to* custom keeps whatever dates were already picked.
   *
   * So flipping to This Month to check something and back doesn't wipe a range
   * you spent two clicks drawing. The dates live in the `custom` variant, and
   * this is the one place that has to decide what an empty one starts as.
   */
  function pick(kind: RangeKind) {
    if (kind !== "custom") return onChange({ kind });
    if (value.kind === "custom") return onChange(value);
    onChange({ kind: "custom", from: null, to: null });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={value.kind} onValueChange={(kind) => pick(kind as RangeKind)}>
        {/* No `name` here, unlike the new-sticker form's Select. Nothing about
            this is a form — there's no submission and no FormData for a hidden
            native select to land in. It's a control whose value lives in React
            state, which is what `value`/`onValueChange` are for. */}
        <SelectTrigger className="w-44" aria-label="Date range">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {RANGE_KINDS.map((kind) => (
            <SelectItem key={kind} value={kind}>
              {RANGE_LABEL[kind]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Only when it's relevant. A pair of date fields sitting permanently
          beside a dropdown that says "This month" is three controls where one
          is doing anything. */}
      {value.kind === "custom" && (
        <CustomRange
          from={value.from}
          to={value.to}
          onChange={(from, to) => onChange({ kind: "custom", from, to })}
        />
      )}
    </div>
  );
}

type CustomProps = {
  from: DayString | null;
  to: DayString | null;
  onChange: (from: DayString | null, to: DayString | null) => void;
};

/**
 * The two edges, drawn by react-day-picker in range mode.
 *
 * `Date` objects live here and nowhere else in this feature. Everything above
 * this component speaks in `"2026-08-12"` strings — that's what the database
 * stores, what the bounds compare, and what can't be wrong by a timezone — but
 * the picker's API is `Date`, so the conversion happens at this boundary and
 * immediately turns back. `toDayString` reads local calendar fields rather than
 * going through UTC, which is the Step 5 trap: an evening click would otherwise
 * select tomorrow.
 */
function CustomRange(props: CustomProps) {
  const selected: DateRange | undefined = props.from
    ? {
        from: fromDayString(props.from),
        to: props.to ? fromDayString(props.to) : undefined,
      }
    : undefined;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2 font-normal">
          <CalendarIcon className="size-4" />
          {label(props.from, props.to)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          autoFocus
          defaultMonth={props.from ? fromDayString(props.from) : undefined}
          selected={selected}
          onSelect={(next) =>
            props.onChange(
              next?.from ? toDayString(next.from) : null,
              next?.to ? toDayString(next.to) : null,
            )
          }
        />
      </PopoverContent>
    </Popover>
  );
}

/**
 * What the button says. Never a bare "Custom" — a control that has been used
 * should show what it was set to, or you have to open it to find out.
 */
function label(from: DayString | null, to: DayString | null): string {
  if (!from) return "Pick dates";
  if (!to) return `${formatDayShort(from)} — …`;
  return `${formatDayShort(from)} — ${formatDayShort(to)}`;
}
