import type { ReactNode } from "react";

import { VIEW } from "@/lib/charts";

type Props = { children: ReactNode };

/**
 * The panel all three charts draw into, at one fixed size.
 *
 * Two of the three got this for free: the star and the donut share a `viewBox`,
 * and an SVG with a `viewBox` and `w-full` takes its height from the ratio, so
 * they were always the same height as each other. The bars are HTML and had no
 * such rule — six rows are as tall as six rows are — so switching to them
 * resized the card and moved everything below it. Which is the same problem the
 * shared `viewBox` was solving, solved for only two thirds of the charts.
 *
 * So the box moves up here and the ratio is stated once. `aspectRatio` is an
 * inline style rather than a class for the reason `Bars` sets its widths that
 * way: Tailwind cannot generate a class for a number it never sees, and this
 * one is read from `VIEW` on purpose. Deriving it means the card cannot drift
 * from the viewBox it's supposed to match.
 *
 * `min-h-fit` is the escape hatch. On a narrow screen the ratio makes the box
 * shorter than six rows of text can fit in, and there is nothing sensible to do
 * about that — a chart panel that clips its own rows is worse than one that is
 * taller than its neighbours. So the bars grow on a phone and the three cards
 * stop matching there. Stated rather than hidden, because it's a real edge.
 *
 * The card also owns `aria-hidden`, which all three charts carried separately.
 * It belongs to the panel rather than to any one drawing: what makes it correct
 * is that `AreaTable` renders these same numbers as a real table on the same
 * page, and that fact is about the page, not about the chart. If a step ever
 * shows a chart without that table, this is the single place that has to
 * change.
 */
export function ChartCard(props: Props) {
  return (
    <figure
      className="rounded-2xl border border-hairline bg-surface p-6"
      aria-hidden="true"
    >
      <div
        className="min-h-fit w-full"
        style={{ aspectRatio: `${VIEW.width} / ${VIEW.height}` }}
      >
        {props.children}
      </div>
    </figure>
  );
}
