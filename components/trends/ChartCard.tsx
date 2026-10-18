import type { ReactNode } from "react";

import { PIE_BOX } from "@/lib/balance-geometry";
import { PANEL } from "@/lib/layout";

type Props = { children: ReactNode };

/** Pie frame at the viewBox ratio; shared with `TrendsSkeleton` so heights match. */
export function ChartCard(props: Props) {
  return (
    <figure className={PANEL}>
      <div
        className="min-h-fit w-full"
        style={{ aspectRatio: `${PIE_BOX.width} / ${PIE_BOX.height}` }}
      >
        {props.children}
      </div>
    </figure>
  );
}
