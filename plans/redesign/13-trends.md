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

## Verify

- With seed data (`npm run seed`), every chart renders at 1440 and 390 with no
  ramp classes left: `grep -rn "ramp-" components/trends` is empty.
