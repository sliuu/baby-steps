# 10 · Sticker tray, tap-to-add, suggestions

- **Status:** DONE
- **Commit:** 9b5b55b
- **Severity:** high
- **Category:** component + data
- **Estimated scope:** `components/tray/*`, new `lib/suggestions.ts` + test

## Problem

The tray (`StickerTray.tsx` 450 lines, `TrayGroup.tsx` 273,
`StickerFields.tsx` 412, `NewStickerForm.tsx` 136, `MarkPicker.tsx` 350) only
supports drag to add, and creating a sticker always starts from a blank form.

## Target

### Tray

- Grouped by category in `sort_order`. Group heading: category name,
  `text-label`, `text-cat-<key>-text`, no box.
- Stickers at `sm` with the name under each in `text-caption`.
- **Tap to add** to the current/selected day, in addition to drag. Use the same
  server action the drop handler calls. Give tap feedback with the existing
  "land" animation. Keyboard: Enter/Space on a focused sticker adds it.
- "+ new sticker" at the end of each group: a dashed `rule-input` circle, `sm`,
  opens the new sticker form with that category preselected.
- Edit/retire/restore flows keep working; restyle their forms with plan 04's
  `Button` and dashed-bottom inputs.
- `compact` prop for the calendar side panel (plan 09).

### Suggestions (no `is_custom`, no new table)

Every row in `activities` is the user's own. Suggestions are only a starting
list in code.

`lib/suggestions.ts`:

```ts
/** Starting ideas per category slug. Picking one creates a normal activity
 *  row owned by the user; nothing here is stored or referenced later. */
export const SUGGESTIONS: Record<CategorySlug, { name: string; mark: string }[]> = {
  spirituality: [/* … */],
  exercise:     [/* … */],
  work:         [/* … */],
  creativity:   [/* … */],
  romance:      [/* … */],
  friends:      [/* … */],
};

/** Suggestions for a category, minus names the user already has
 *  (case-insensitive, trimmed — same rule as the unique index). */
export function suggestionsFor(slug: CategorySlug, existing: string[]): Suggestion[];
```

- Stephanie writes the list. Seed it with 4–6 per category taken from the
  onboarding mock as placeholders and mark the array with a `// copy: TODO`
  comment.
- `mark` must be a valid single grapheme or icon key accepted by `MarkPicker`.
- Test: filtering is case-insensitive; already-owned names are removed; every
  mark passes the existing mark validator.

### Chips

New `components/ui/Chip.tsx`, used here and in onboarding:

- `variant="suggestion"`: dashed 1px `rule-input` pill, `text-label`, a "+"
  before the name.
- `variant="chosen"`: solid 1px `ink` pill with an 8px `bg-cat-<key>` dot.
- Toggle button semantics (`aria-pressed`).

In `NewStickerForm`, show the category's `suggestionsFor` chips above the name
field. Tapping one fills name + mark; the user can still edit before saving.

> **Amended (as built):**
> - Tap or Enter adds to today. Space still lifts a keyboard drag (dnd-kit's start key), so Enter is the add.
> - Edit is a pencil badge on the tile's corner (hover/focus on desktop, always on touch). The eye stays too: on headings, and as a tile badge on desktop.
> - The header "+" and per-heading "+" became a dashed "+ new" tile at the end of each group.
> - The tray sits under Today at every width, phones included. Week and Month keep the desktop rail until plan 09.
> - Tapping a sticker already on today replays the land animation and writes nothing.
> - `LibraryGroup.slug` is optional; an unknown slug gets no suggestions. Matching is case-insensitive, stricter than the DB's exact-match index.
> - `cn` now knows the custom text sizes, so `text-label` no longer cancels `text-ink`/`text-paper` (an app-wide fix).
> - `StickerTray compact` exists for plan 09's panel.

## Verify

- Tap and drag both add stickers; both animate.
- Picking a suggestion creates an ordinary row; the suggestion disappears from
  the list next time.
- `npm test` includes `suggestions.test.ts`.
