# 08 · Today view

- **Status:** TODO
- **Commit:** —
- **Severity:** high (the main screen)
- **Category:** screen
- **Estimated scope:** `components/calendar/TodayView.tsx`, a balance query

## Problem

`TodayView.tsx` (304 lines) is laid out for the old newsprint page. It needs
the stationery layout and the flower.

## Target (1440)

Two columns inside the sheet, 64px gutter, 44px top padding:

- **Left (wide):**
  - Date: `text-display`, display face 300, numeric (`10/15/2026`), with the
    weekday above it in `text-label ink-muted` ("thursday").
  - Mood picker (plan 06).
  - "today" stickers: a wrap of `lg` stickers, each with its name under it
    (`text-label`). Empty state: a single dashed-outline circle (`rule-input`,
    64px) and the line "nothing yet. tap a sticker to add it." (placeholder
    copy).
  - Note: the existing note field, restyled: no box, a dashed bottom rule
    `rule-input`, display face 300 at `text-body-lg`, 280-char counter in
    caption.
- **Right (narrow, ~320px):** the flower (plan 07) with the heading
  "this week" removed in favour of a single caption under it ("last three
  weeks"). Placeholder copy.
- Below both, separated by a 1px `rule`: the sticker tray (plan 10).

## Target (390)

One column: date, mood, stickers, note, flower (scaled to the column width),
tray.

## Data

Add a server query (next to `lib/queries/stickers.ts`) that returns day →
category ids for the last 21 days, then call `balanceLevels` server-side and
pass `levels` to the client. Reuse an existing range query if one exists
rather than adding a new round trip.

## Keep

All existing behaviour: adding/removing/reordering stickers, drag and drop,
highlight toggle, notes saving, optimistic updates, the plan-002 animations.

> **Amended (as built):**
> - Balance is computed client-side from the already-loaded `stickersByDay` (optimistic), not by a new server query.
> - The tray stays a side rail until plan 10. The seven-day strip was removed, and Today always shows today.
> - Stickers are removed with an × badge (hover on desktop, always shown on touch); the dashed circle opens the add sheet.
> - `MoodRow` was restyled to coloured faces; the day sheet shares it.

## Verify

- 1440 and 390 match the layout above.
- Add a sticker in a category with level 0 → the flower updates after the
  action revalidates.
- No horizontal scroll at 390.
