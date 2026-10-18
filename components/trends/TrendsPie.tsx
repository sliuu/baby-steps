"use client";

import { ChartCard } from "./ChartCard";
import { LifePie } from "@/components/balance/LifePie";
import type { Tally } from "@/lib/analytics";
import type { Balance, Level } from "@/lib/balance";
import { normalize } from "@/lib/charts";

/** The onboarding pie, read-only; rings by share of the busiest category. */
export function TrendsPie(props: { tally: Tally }) {
  const { categories } = props.tally;
  if (categories.length === 0) return null;

  const shares = normalize(categories.map((category) => category.count));
  const levels: Balance = Object.fromEntries(
    categories.map((category, i) => [category.categoryId, Math.ceil(shares[i] * 3) as Level]),
  );

  return (
    <ChartCard>
      <LifePie
        categories={categories.map((category) => ({
          id: category.categoryId,
          name: category.categoryName,
          colorKey: category.colorKey,
        }))}
        levels={levels}
        className="mx-auto h-full max-w-120 lowercase"
      />
    </ChartCard>
  );
}
