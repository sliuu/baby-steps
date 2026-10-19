# 14 · `/dev/system` living reference

- **Status:** DONE
- **Commit:** 9dc0c04
- **Severity:** low (internal), but high value for keeping the system clean
- **Category:** tooling
- **Estimated scope:** `app/dev/system/page.tsx`, small helper components

## Problem

The design system lives on a canvas outside the repo. Without an in-repo
reference, tokens drift and one-off styles creep back.

## Target

A page that renders the real tokens and components, so it can never disagree
with the app.

- Route `app/dev/system/page.tsx`. Only available in development or to an
  allow-listed email; `notFound()` otherwise. Check how Next 16 handles
  `notFound` in server components before writing it.
- Sections, each rendering real tokens/components (not copied values):
  1. Colour: frame, paper, raised, ink (+ muted/subtle), accent, the four
     rules. Each swatch shows token name and computed value
     (`getComputedStyle` in a tiny client component).
  2. Categories: for each of the six, a swatch of ink/text/on and a `StickerMark`
     at all four sizes.
  3. Moods: five `MoodFace` circles, five `MoodDot`s, an interactive
     `MoodPicker`.
  4. Type: every `--text-*` role with its token name and a lowercase sample.
  5. Spacing: bars for each spacing step.
  6. Buttons and chips: every variant and size, plus disabled and focus.
  7. Balance: flower at all-0, mixed, all-3; an interactive `LifePie` wired to
     the flower so both show the same levels; the verdict line.
  8. Frame toggle: blush / espresso (sets `data-frame` on `<html>`).
- Link to it from nowhere in the product; mention the URL in PROGRESS.

## Rule going forward

A new component lands in `/dev/system` in the same commit it is created.

> **Amended (as built):**
> - No verdict line yet: `verdict()` arrives with plan 12. Add it to the balance section then.
> - `/dev` is in `proxy.ts`'s public paths; the page gates itself. In development anyone sees it. In production it 404s unless the signed-in email is in `DEV_SYSTEM_EMAILS` (comma-separated env var).
> - Focus states are shown by tabbing through the button table, not by a frozen "focused" column.
> - Values (hex, px) are read live from computed styles, so they can't drift from `globals.css`.

## Verify

- Visible in dev, 404 in a production build for a non-allow-listed user.
- Changing a token in globals.css changes the page with no other edits.
