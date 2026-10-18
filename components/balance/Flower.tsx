"use client";

import { useId } from "react";
import type { Balance } from "@/lib/balance";
import { BALANCE_VIEW, LEVEL_RADII, PETAL_PATH } from "@/lib/balance-geometry";
import { categoryColor } from "@/lib/palette";
import { ArcLabels, balanceLabel, type BalanceCategory } from "./shared";

const { size, cx, cy } = BALANCE_VIEW;
const PETAL_START = 6;
const BUD = 10;

type Props = {
  /** Display order; petal 0 at the top, then clockwise. */
  categories: BalanceCategory[];
  levels: Balance;
  /** Off: no arc labels, and the box crops to the outer ring. */
  labels?: boolean;
  /** Stroke for the dotted level rings. */
  ringClassName?: string;
  className?: string;
};

/** One petal per category; length snaps to its balance level. */
export function Flower(props: Props) {
  const idPrefix = useId();
  const n = props.categories.length;
  const labels = props.labels ?? true;
  const inset = labels ? 0 : cx - LEVEL_RADII[LEVEL_RADII.length - 1] - 0.5;

  return (
    <svg
      viewBox={`${inset} ${inset} ${size - 2 * inset} ${size - 2 * inset}`}
      role="img"
      aria-label={balanceLabel(props.categories, props.levels)}
      className={props.className}
    >
      {LEVEL_RADII.map((r) => (
        <circle key={r} cx={cx} cy={cy} r={r} strokeDasharray="1 4" className={`fill-none ${props.ringClassName ?? "stroke-rule-grid"}`} />
      ))}

      {props.categories.map((category, i) => {
        const level = props.levels[category.id] ?? 0;
        const length = level === 0 ? BUD : LEVEL_RADII[level - 1] - PETAL_START;
        const degrees = (360 / n) * i;
        return (
          <g key={category.id} transform={`translate(${cx} ${cy}) rotate(${degrees}) translate(0 ${-PETAL_START})`}>
            <path
              d={PETAL_PATH}
              style={{ "--petal": length } as React.CSSProperties}
              className={`origin-bottom transition-[transform,fill] duration-(--dur-hero) ease-(--ease-enter) [transform-box:fill-box] [transform:scale(var(--petal))] starting:[transform:scale(0)] ${
                level === 0 ? "fill-rule" : categoryColor(category.colorKey).fill
              }`}
            />
          </g>
        );
      })}

      <circle cx={cx} cy={cy} r={4.5} className="fill-ink" />
      {labels && <ArcLabels categories={props.categories} idPrefix={idPrefix} />}
    </svg>
  );
}
