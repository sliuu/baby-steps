import type { ReactNode } from "react";

import { VIEW } from "@/lib/charts";
import { PANEL } from "@/lib/layout";

type Props = { children: ReactNode };

/**
 * The panel the Life Star draws into, at one fixed size.
 *
 * It was built for three tenants and has one left. The star and the donut
 * shared a `viewBox`, so they were always the same height as each other; the
 * bars were HTML and as tall as their rows, so switching to them resized the
 * card and moved everything below it. The box moved up here and the ratio got
 * stated once.
 *
 * Kept, rather than folded back into `LifeStar`, because `TrendsSkeleton`
 * renders it too — that is the whole point of the file. The skeleton has to
 * reserve exactly the height the real card will take, and the only way it
 * cannot disagree is by rendering the same component.
 *
 * `aspectRatio` is an inline style rather than a class for the reason
 * `MostDone` sets its bar widths that way: Tailwind cannot generate a class for
 * a number it never sees, and this one is read from `VIEW` on purpose. Deriving
 * it means the card cannot drift from the viewBox it's supposed to match.
 * `min-h-fit` is the escape hatch for a narrow screen, where the ratio would
 * make the box shorter than its own contents.
 *
 * It is not a card any more, and the name stayed. What it draws now is the
 * rule above the star and the space under it — see `PANEL`, which is the
 * week strip's chrome spread across the rest of the app. The fixed ratio is
 * the reason the file still exists either way.
 *
 * The card owns `aria-hidden`. It belongs to the panel rather than to the
 * drawing: what makes it correct is that `AreaTable` renders these same numbers
 * as a real table on the same page, and that fact is about the page, not about
 * the chart. If a step ever shows a chart without that table, this is the
 * single place that has to change.
 */
export function ChartCard(props: Props) {
  return (
    <figure className={PANEL} aria-hidden="true">
      <div
        className="min-h-fit w-full"
        style={{ aspectRatio: `${VIEW.width} / ${VIEW.height}` }}
      >
        {props.children}
      </div>
    </figure>
  );
}
