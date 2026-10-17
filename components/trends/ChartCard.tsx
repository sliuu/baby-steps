import type { ReactNode } from "react";

import { VIEW } from "@/lib/charts";
import { PANEL } from "@/lib/layout";

type Props = { children: ReactNode };

/** The star's frame at the viewBox ratio. Shared with `TrendsSkeleton` so heights match. */
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
