# 07 · Balance level and the flower

- **Status:** TODO
- **Commit:** —
- **Severity:** medium (new feature)
- **Category:** logic + component
- **Estimated scope:** new `lib/balance.ts` + test, new `components/balance/Flower.tsx`, `LifePie.tsx`

## Problem

Today has no picture of balance. Trends has `LifeStar` (`lib/lifestar.ts`,
`components/trends/LifeStar.tsx`), a radar of counts over a chosen range. The
new design shows a **flower** on today and a **life pie** in onboarding, both
driven by one small number per category.

## Target

### `lib/balance.ts` (pure, tested)

```ts
export type Level = 0 | 1 | 2 | 3;
export type Balance = Record<string /* category id */, Level>;

/** Level = how many of the last 3 calendar weeks (Mon–Sun, the current week
 *  included) contain at least one sticker in that category. */
export function balanceLevels(input: {
  categories: { id: string }[];
  days: { day: string /* yyyy-mm-dd */; categoryIds: string[] }[];
  today: Date;
  weekStartsOn?: 0 | 1; // match whatever the calendar uses today
}): Balance;

/** For copy: spread = max - min level. */
export function balanceSpread(b: Balance): number;
```

Use the same week-start setting the calendar already uses (check
`lib/` date helpers) so "this week" means the same thing everywhere.

`lib/balance.test.ts`: empty history → all 0; one sticker this week → 1;
stickers in each of 3 weeks → 3; stickers 4 weeks ago don't count; several
stickers in one week still count once.

### `components/balance/Flower.tsx`

SVG, viewBox 280×280, centre (140,140). Props: `categories` (id, name, colorKey
in display order), `levels: Balance`.

- Six petals at 60° steps, starting at the top, clockwise in category
  `sort_order`.
- Petal length snaps to the level. Reach radius by level: 0 → bud (a 10px
  closed petal in `rule`), 1 → 56, 2 → 80, 3 → 104. Petals start 6px from the
  centre.
- Petal shape: a teardrop path, width ≈ 0.42 × length, filled `fill-cat-<key>`.
- Guide rings: three dotted circles at r = 56, 80, 104, stroke `rule-grid`,
  `stroke-dasharray="1 4"`.
- Centre: 9px dot, `fill-ink`. Not more prominent than that.
- Labels: category name on a `<textPath>` arc just outside r = 104 (r ≈ 118),
  centred on the petal's angle, `text-caption`, `fill-cat-<key>-text`. Flip the
  arc direction for the bottom half so text never reads upside down.
- Animate petal growth with the existing motion tokens; honour
  `prefers-reduced-motion`.
- Accessible: `role="img"` with an `aria-label` listing each category and its
  level ("exercise 3 of 3, work 1 of 3, …").

### `components/balance/LifePie.tsx`

Same data, editable. 6 slices × 3 rings. Props: `levels`, `onChange?`.

- Each slice is a category; ring k (1–3) is filled `fill-cat-<key>` when level ≥
  k, else `paper` with a `rule-grid` stroke.
- Tapping ring k of a slice sets that category to k; tapping the filled
  outermost ring again sets it to k − 1 (so 0 is reachable).
- Keyboard: each slice is a focusable `role="slider"` with `aria-valuemin=0`,
  `max=3`, arrow keys change it.
- Labels outside the pie, same arc treatment as the flower.

### Shared geometry

Put the angle/arc/polar helpers in `lib/balance-geometry.ts` and test the
non-trivial ones (label arc flipping). `lib/lifestar.ts` may reuse them, but
don't refactor LifeStar in this plan.

## Verify

- `npm test` covers `balance.ts`.
- `/dev/system` shows the flower at levels all-0, mixed, all-3, and the pie
  being clicked.
- Labels never overlap petals and never read upside down.
