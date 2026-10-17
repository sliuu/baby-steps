# 09 · Month and week views, day sheet

- **Status:** TODO
- **Commit:** —
- **Severity:** high
- **Category:** screen
- **Estimated scope:** `MonthGrid.tsx`, `WeekGrid.tsx`, `DayCell.tsx`, `DaySheet.tsx`, `DayModal.tsx`, `MonthDots.tsx`, calendar page

## Problem

Month and week are separate nav items today; cells use ramp tints and the red
today mark. `DayCell.tsx` is 354 lines and mixes several looks.

## Target

One **calendar** page (nav item from plan 04) with a `month · week` text
toggle beside the month title. Title: "october 2026" in `text-display-sm`;
previous/next as outline `sm` icon buttons.

### Grid

- Inside lines only: 1px `rule-grid` between cells, no outer border.
- Weekday header: `text-caption ink-muted`, lowercase ("mon").
- Cell, top row: date number (`text-caption`) with the `MoodDot` 6px to its
  right when a mood exists.
- Today: the date number sits in an 22px `accent-ink` circle with `paper`
  text.
- Selected day: 2px `accent-ink` inset ring around the cell.
- Future days: 45% opacity, not clickable for logging.
- Stickers: **all** stickers for the day as `xs` (20px), wrapping, 4px gap. If
  they overflow the cell, the cell grows (month view) rather than showing "+3".
  If that makes rows too uneven at 1440 with real data, cap at two rows and show
  `+n` in caption; note the decision in PROGRESS.

### Side panel (1440) / sheet (390)

Selecting a day opens a panel to the right of the grid (≥ 1024px) or the
existing bottom sheet / modal on smaller screens (`DaySheet` / `DayModal`).
Contents, top to bottom:

1. Date, numeric, `text-heading`.
2. Mood picker (plan 06).
3. That day's stickers at `md` (44px) with names; tap to remove (existing
   behaviour).
4. "add to this day": the sticker bank grouped by category, each group with
   its name in `text-label text-cat-<key>-text`, stickers at `sm` with names.
   This reuses the tray component from plan 10 in a compact mode, not a
   second implementation.

### Cleanup inside this plan

Split `DayCell.tsx` if it helps: `DayCellFrame` (grid cell, states) and
`DayCellStickers` (the wrap). Keep the dnd-kit drop target behaviour.

> **Amended (as built):**
> - The panel shows today until you pick a day. Phones keep `MonthDots` / `WeekList` and open the sheet; `DayModal` is gone.
> - Week uses the same `DayCell`, taller. Week's bars and in-cell notes are gone; the note lives in the panel.
> - The cell's mood is a static dot; the panel sets mood.
> - Future days: contents fade (not the cell, so grid lines don't show through); no select, no drops.
> - No `+n` cap: the cell grows.
> - `DayCell` stayed one file (~140 lines), so no split.
> - The tray rail is gone, and with it highlighting by mood (`MoodPicker` deleted). Category and sticker highlight remain via the eye.
> - Phone title drops to `text-heading` and the toggle sits under it, so "october 2026" fits.

## Verify

- Month at 1440: grid lines inside only; today circle; selected ring; future
  faded; panel opens to the right and logs to the selected day.
- 390: tapping a day opens the sheet; logging works; no overflow.
- Week view uses the same cell component.
