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
 * a dropdown. This control governs every number on the page, and it does so
 * quietly — a loud pill for a filter would out-shout the panels it filters.
 *
 * Its *trigger* is a bordered control now, which is not the same thing: an
 * outline around a label and a chevron, sitting under the Areas · Habits ·
 * Moods pill and turning the same small corner it does — see `CONTROL_RADIUS`.
 * It is still one value in a closed box, and opening it is still a list.
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
        {/* An outlined box on white, sized to its label. It was a fixed 11rem
            rectangle; the width was there to stop the dates beside it jumping
            as the label changed length, and on a phone the dates sit at the
            far end of the row instead, where the label's width can't move
            them. `data-[size=default]:` because the trigger sets its height
            through that variant, and a bare `h-9` loses to it. */}
        <SelectTrigger
          className="gap-[7px] rounded-sm border-hairline bg-surface pr-2.5 pl-3 text-[0.8rem] data-[size=default]:h-9 dark:bg-surface"
          aria-label="Date range"
        >
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
        <Button variant="outline" className="h-9 gap-2 rounded-sm font-normal">
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
