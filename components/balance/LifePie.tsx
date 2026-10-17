"use client";

import { useId, useState } from "react";
import type { Balance, Level } from "@/lib/balance";
import { BALANCE_VIEW, LEVEL_RADII, itemAngle, ringSector } from "@/lib/balance-geometry";
import { categoryColor } from "@/lib/palette";
import { ArcLabels, balanceLabel, type BalanceCategory } from "./shared";

const { size } = BALANCE_VIEW;
const HOLE = 16;
/** Ring k spans EDGES[k-1]..EDGES[k]. */
const EDGES = [HOLE, ...LEVEL_RADII];

type Props = {
  categories: BalanceCategory[];
  levels: Balance;
  /** Omit for a read-only pie. */
  onChange?: (categoryId: string, level: Level) => void;
  className?: string;
};

const clamp = (n: number) => Math.max(0, Math.min(3, n)) as Level;

/** Six slices × three rings; ring k is filled when level ≥ k. */
export function LifePie(props: Props) {
  const idPrefix = useId();
  const [focused, setFocused] = useState<number | null>(null);
  const n = props.categories.length;
  const half = Math.PI / n;
  const editable = Boolean(props.onChange);

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      role={editable ? "group" : "img"}
      aria-label={editable ? "life pie" : balanceLabel(props.categories, props.levels)}
      className={props.className}
    >
      {props.categories.map((category, i) => {
        const level = props.levels[category.id] ?? 0;
        const angle = itemAngle(i, n);
        const set = (next: Level) => props.onChange?.(category.id, next);

        return (
          <g
            key={category.id}
            {...(editable && {
              role: "slider",
              tabIndex: 0,
              "aria-label": category.name,
              "aria-valuemin": 0,
              "aria-valuemax": 3,
              "aria-valuenow": level,
              "aria-valuetext": `${level} of 3`,
              onFocus: (event: React.FocusEvent<SVGGElement>) =>
                setFocused(event.currentTarget.matches(":focus-visible") ? i : null),
              onBlur: () => setFocused(null),
              onKeyDown: (event: React.KeyboardEvent) => {
                const next = {
                  ArrowUp: level + 1,
                  ArrowRight: level + 1,
                  ArrowDown: level - 1,
                  ArrowLeft: level - 1,
                  Home: 0,
                  End: 3,
                }[event.key];
                if (next === undefined) return;
                event.preventDefault();
                set(clamp(next));
              },
            })}
            className="outline-none"
          >
            {[1, 2, 3].map((ring) => {
              const filled = level >= ring;
              return (
                <path
                  key={ring}
                  d={ringSector(EDGES[ring - 1], EDGES[ring], angle - half, angle + half)}
                  onClick={editable ? () => set(clamp(level === ring ? ring - 1 : ring)) : undefined}
                  className={`transition-colors duration-(--dur-menu-in) ${
                    filled
                      ? `${categoryColor(category.colorKey).fill} stroke-paper stroke-2`
                      : "fill-paper stroke-rule-grid"
                  } ${editable ? "cursor-pointer" : ""}`}
                />
              );
            })}
          </g>
        );
      })}

      {focused !== null && (
        <path
          d={ringSector(HOLE, LEVEL_RADII[2], itemAngle(focused, n) - half, itemAngle(focused, n) + half)}
          className="pointer-events-none fill-none stroke-accent-ink stroke-2"
        />
      )}

      <ArcLabels categories={props.categories} idPrefix={idPrefix} />
    </svg>
  );
}
