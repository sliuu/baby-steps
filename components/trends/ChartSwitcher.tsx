"use client";

import { RadioGroup as RadioGroupPrimitive } from "radix-ui";

import {
  CHART_KINDS,
  CHART_LABEL,
  type ChartKind,
} from "@/lib/charts";
import { segment } from "@/lib/layout";

type Props = {
  value: ChartKind;
  onChange: (chart: ChartKind) => void;
};

/**
 * Three lenses on one tally, as a segmented pill.
 *
 * A radio group, not three buttons and not a `<select>`. The options are few,
 * short, and mutually exclusive, and you flip between them repeatedly while
 * looking at the same numbers — that's the case a segmented control exists for,
 * where a dropdown would hide two of the three answers behind a click each. It
 * being a *radio group* rather than three buttons is what makes the keyboard
 * work: arrow keys move between segments, Tab leaves the control entirely, and
 * a screen reader announces "Pie, radio button, 2 of 3" instead of three
 * unrelated buttons.
 *
 * Built on the Radix primitives directly rather than on `components/ui/
 * radio-group`. That preset's item is a hard-styled `size-4` circle with an
 * indicator dot inside it — the right shape for the mood picker in the day
 * modal, which still uses it, and the wrong one here: a pill would have to
 * override every one of those classes and would still carry the dot. Same
 * library, same behaviour, none of the fight. The rule this follows is that a
 * preset is a starting point for the shape it was drawn for, and reaching for
 * the primitive underneath is cheaper than un-styling it.
 *
 * The appearance comes from `segment`, shared with the top nav. Two controls
 * that look identical and are made of different elements — see the note there.
 */
export function ChartSwitcher(props: Props) {
  return (
    <RadioGroupPrimitive.Root
      value={props.value}
      onValueChange={(value) => props.onChange(value as ChartKind)}
      // Without this a screen reader reaching the group announces "radio group"
      // and nothing else. There is no visible label to point `aria-labelledby`
      // at — the pill's three words are the label, and they're the options.
      aria-label="Chart"
      // Radix defaults a radio group to vertical, and the orientation isn't
      // decoration: it's which arrow keys move the selection. Left/Right on a
      // row of segments is what a hand expects.
      orientation="horizontal"
      className="flex items-center gap-1"
    >
      {CHART_KINDS.map((kind) => (
        <RadioGroupPrimitive.Item
          key={kind}
          value={kind}
          className={segment(kind === props.value)}
        >
          {CHART_LABEL[kind]}
        </RadioGroupPrimitive.Item>
      ))}
    </RadioGroupPrimitive.Root>
  );
}
