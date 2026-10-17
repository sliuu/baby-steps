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

/** The range for every panel: a quiet dropdown, plus dates for custom. */
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
        {/* Unboxed, like a nav link: the active range, underlined. */}
        <SelectTrigger
          className="gap-1 border-0 bg-transparent px-0 text-ui text-ink lowercase underline decoration-accent-ink underline-offset-[6px] shadow-none data-[size=default]:h-auto dark:bg-transparent"
          aria-label="Date range"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="lowercase">
          {RANGE_KINDS.map((kind) => (
            <SelectItem key={kind} value={kind}>
              {RANGE_LABEL[kind]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Dates only for custom. */}
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

/** Custom range. `Date` only at this boundary; everything else uses day strings. */
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
        <Button variant="outline" size="sm" className="gap-2">
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

/** Shows what it's set to, not "custom". */
function label(from: DayString | null, to: DayString | null): string {
  if (!from) return "pick dates";
  if (!to) return `${formatDayShort(from)} — …`;
  return `${formatDayShort(from)} — ${formatDayShort(to)}`;
}
