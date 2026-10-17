# 06 · Mood picker and mood dot

- **Status:** DONE
- **Commit:** 3afbdb1
- **Severity:** medium
- **Category:** component
- **Estimated scope:** `components/tray/MoodPicker.tsx`, `components/calendar/MoodMark.tsx`, `lib/moods.ts`

## Problem

`tray/MoodPicker.tsx` (152 lines) and `calendar/MoodMark.tsx` (42) render mood
with ramp colours, great → rough. The new design uses one mood colour scale,
sad → happy, and the same colour must mean the same thing on today and on the
calendar.

## Target

Two exports from one file, `components/ui/Mood.tsx`:

- `MoodFace({ mood, size })` – the existing face path (`MOOD_MOUTH` + head),
  stroke `ink`, 1.5.
- `MoodDot({ mood })` – 11px circle, `bg-mood-<id>`, inset 1px `rule`. Used
  next to the date number in calendar cells. `aria-hidden`; the cell's label
  includes the mood word.

`MoodPicker` (rewrite in place, keep its save logic and server action calls):

- `role="radiogroup"`, `aria-label="mood"`; five `role="radio"` buttons,
  44px circles, `bg-mood-<id>` with `MoodFace` inside, `aria-label` = mood
  word.
- Order from `MOODS` (sad → happy, plan 02).
- Unselected: inset 1px `rule`. Selected: inset 2px `accent-ink`.
- Arrow keys move selection (radiogroup pattern); clicking the selected mood
  clears it if that is how it works today (keep current behaviour).
- Label above it: "how are you feeling?" (`text-label`, `ink-muted`). Copy is a
  placeholder; Stephanie writes final copy.

`MoodMark.tsx` becomes a re-export of `MoodDot` or is deleted with its callers
moved (plan 15 removes leftovers).

> **Amended (as built):**
> - The radio group is the tray's `MoodPicker`, as written (Stephanie chose this). Its job is still to **highlight** days with that mood, not to save one. Saving stays in `MoodRow` (Today, day sheet) and the cell popover. Drag still works: Space starts a keyboard drag, and arrows move the selection.
> - Circles are up to 44px and shrink to fit the 14rem rail.
> - `MoodMark` is kept as the face on its mood colour (24px, self-labelled), so Today, the day sheet, the popover and Trends show the same colour. Calendar cells (month, week columns, phone week, 404) use `MoodDot`.
> - The dot size is the `--size-mood-dot` token.

## Verify

- Today and calendar show the identical colour for the same day.
- Screen reader: "mood, radio group, rough, 1 of 5".
- Trends mood charts still read low → high correctly after the order change.
