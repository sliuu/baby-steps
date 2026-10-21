"use client";

import { useState } from "react";
import type { Balance, Level } from "@/lib/balance";
import { BALANCE_VIEW, PIE_BOX, itemAngle, ringSector } from "@/lib/balance-geometry";
import { polar } from "@/lib/charts";
import { categoryColor } from "@/lib/palette";
import { balanceLabel, type BalanceCategory } from "./shared";

const { cx, cy } = BALANCE_VIEW;
/** Ring k spans EDGES[k-1]..EDGES[k]; evenly spaced, no hole. */
const EDGES = [0, 35, 70, 104];
const LABEL_R = 112;
const VIEW_BOX = `${PIE_BOX.x} ${PIE_BOX.y} ${PIE_BOX.width} ${PIE_BOX.height}`;

type Props = {
  categories: BalanceCategory[];
  levels: Balance;
  /** Omit for a read-only pie. */
  onChange?: (categoryId: string, level: Level) => void;
  className?: string;
};

const clamp = (n: number) => Math.max(0, Math.min(3, n)) as Level;

/** Six slices × three rings; a filled slice reaches out to its level. */
export function LifePie(props: Props) {
  const [focused, setFocused] = useState<number | null>(null);
  const n = props.categories.length;
  const half = Math.PI / n;
  const editable = Boolean(props.onChange);

  return (
    <svg
      viewBox={VIEW_BOX}
      role={editable ? "group" : "img"}
      aria-label={editable ? "life pie" : balanceLabel(props.categories, props.levels)}
      className={props.className}
    >
      {/* Spokes under the fills. */}
      <g aria-hidden className="pointer-events-none stroke-rule">
        {props.categories.map((category, i) => {
          const end = polar(cx, cy, EDGES[3], itemAngle(i, n) - half);
          return <line key={category.id} x1={cx} y1={cy} x2={end.x} y2={end.y} />;
        })}
      </g>

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
                    filled ? categoryColor(category.colorKey).fill : "fill-transparent"
                  } ${editable ? "cursor-pointer" : ""}`}
                />
              );
            })}
          </g>
        );
      })}

      {/* Rings over the fills, faint on colour. */}
      <g aria-hidden className="pointer-events-none fill-none">
        <circle cx={cx} cy={cy} r={EDGES[1]} className="stroke-rule-grid" />
        <circle cx={cx} cy={cy} r={EDGES[2]} className="stroke-rule-grid" />
        <circle cx={cx} cy={cy} r={EDGES[3]} className="stroke-rule" />
      </g>

      {focused !== null && (
        <path
          d={ringSector(0, EDGES[3], itemAngle(focused, n) - half, itemAngle(focused, n) + half)}
          className="pointer-events-none fill-none stroke-ink stroke-2"
        />
      )}

      <g aria-hidden>
        {props.categories.map((category, i) => {
          const angle = itemAngle(i, n);
          const at = polar(cx, cy, LABEL_R, angle);
          const side = Math.cos(angle);
          const down = Math.sin(angle);
          // "romance & adventure" → two lines.
          const lines = category.name.split(/(?<=&) /);
          const lead = down < -0.5 ? -(lines.length - 1) * 1.2 : down > 0.5 ? 0 : -(lines.length - 1) * 0.6;
          return (
            <text
              key={category.id}
              x={at.x}
              y={at.y}
              textAnchor={side > 0.2 ? "start" : side < -0.2 ? "end" : "middle"}
              dominantBaseline={down < -0.5 ? "auto" : down > 0.5 ? "hanging" : "middle"}
              className="fill-ink text-ui sm:text-caption"
            >
              {lines.map((line, k) => (
                <tspan key={k} x={at.x} dy={`${k === 0 ? lead : 1.2}em`}>
                  {line}
                </tspan>
              ))}
            </text>
          );
        })}
      </g>
    </svg>
  );
}
