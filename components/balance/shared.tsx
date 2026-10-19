import type { Balance } from "@/lib/balance";
import { itemAngle, labelArc } from "@/lib/balance-geometry";
import { categoryColor } from "@/lib/palette";

export type BalanceCategory = { id: string; name: string; colorKey: string };

/** "exercise 3 of 3, work 1 of 3, …" */
export function balanceLabel(categories: BalanceCategory[], levels: Balance) {
  return categories.map((c) => `${c.name} ${levels[c.id] ?? 0} of 3`).join(", ");
}

/** Category names on arcs outside r 104, upright in both halves. */
export function ArcLabels(props: { categories: BalanceCategory[]; idPrefix: string }) {
  const n = props.categories.length;
  const span = (Math.PI / n) * 0.95;

  return (
    <g aria-hidden>
      {props.categories.map((category, i) => {
        const id = `${props.idPrefix}-arc-${i}`;
        return (
          <g key={category.id}>
            <path id={id} d={labelArc(itemAngle(i, n), span)} fill="none" />
            <text className={`text-caption ${categoryColor(category.colorKey).textFill}`}>
              <textPath href={`#${id}`} startOffset="50%" textAnchor="middle">
                {category.name}
              </textPath>
            </text>
          </g>
        );
      })}
    </g>
  );
}
