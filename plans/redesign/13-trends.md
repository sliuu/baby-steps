# 13 · Trends restyle

- **Status:** TODO
- **Commit:** —
- **Severity:** medium
- **Category:** screen
- **Estimated scope:** `components/trends/*` (`TrendsBoard` 471, `HabitTable` 704, `LifeStar` 176, `MoodLine` 247, `MoodBars` 87, `CategoryBars`, `RangePicker`, `ChartCard`, `Readout`)

## Problem

Trends uses ramp colours, card boxes and the old type. After 02–06 it is
half-converted.

## Target

Restyle only; keep every calculation and the range picker logic.

- `ChartCard`: no box. Title in `text-subhead`, a 1px `rule` above each
  section, 44px between sections.
- Category colours from `categoryColor()` (`fill-cat-*`, `text-cat-*-text`);
  mood colours from `--mood-*`; axes and grid in `rule-grid`; labels
  `text-caption ink-muted`.
- `LifeStar` (decision 4): keep, recolour, rings in `rule-grid` dotted like the
  flower. Do not merge it with the flower.
- `MoodLine` / `MoodBars`: low at the bottom/left, great at top/right (check
  after plan 02's order change).
- `RangePicker`: text buttons with the active underline from the header.
- `HabitTable`: inside-only grid lines like the calendar; sticker icons `xs`.

> **Amended (as built):**
> - The range picker stays a dropdown (eight ranges are too many for a row of text buttons), with the trigger unboxed: lowercase text, accent underline. The tabs are the text buttons with the header's underline.
> - `RULE` in `lib/layout.ts` is now 1px `border-rule` app-wide (was 2px). `PANEL` is `RULE` + `pt-5`.
> - Habit plot blocks use the category ink: full for "most days", 60% for "some", `rule-grid` for none.
> - Headings are `text-subhead` in the display face; the star has no heading so its rule lines up with the bars'.

## Verify

- With seed data (`npm run seed`), every chart renders at 1440 and 390 with no
  ramp classes left: `grep -rn "ramp-" components/trends` is empty.
