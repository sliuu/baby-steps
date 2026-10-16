# 04 · Frame, sheet, header, account menu, footer

- **Status:** TODO
- **Commit:** —
- **Severity:** high (every signed-in screen)
- **Category:** layout
- **Estimated scope:** `components/AppShell.tsx`, `TopNav.tsx`, `BottomNav.tsx`, `UserMenu.tsx`, `ThemeToggle.tsx`, `lib/nav.ts`, new `components/ui/` primitives

## Problem

`AppShell.tsx` (100 lines) lays the app out on a flat page with `TopNav`
(88) on desktop and `BottomNav` (133) on phones. `UserMenu` (64) and
`ThemeToggle` (51) sit in the nav. Nothing reads as "a sheet of paper in a
frame".

## Target

```
┌ frame (bg-frame, padding 44px; 14px on phones) ─────────────┐
│ ┌ sheet (bg-paper, shadow-sheet, square corners) ─────────┐ │
│ │ baby steps            today  calendar  trends   (avatar) │ │
│ │ ──────────────────────────── 1px ink rule ─────────────── │ │
│ │                                                          │ │
│ │ page content                                             │ │
│ └──────────────────────────────────────────────────────────┘ │
│ © 2026 baby steps      privacy   terms   contact   (on-frame)│
└──────────────────────────────────────────────────────────────┘
```

### New reusable pieces, `components/ui/`

Build these first; later plans use them.

- `PageFrame.tsx` – frame + sheet + footer slot. Props: `header`, `children`.
  The sheet has `min-h` so the footer sits below the fold on short pages.
- `SiteFooter.tsx` – caption size, `text-on-frame`, links as plain text links.
  Privacy/terms/contact can point at `#` until pages exist (note this in
  PROGRESS).
- `Button.tsx` – variants `outline` (default: 1px ink border, pill, transparent),
  `filled` (ink background, paper text; **one per screen**), `text` (underline
  on hover only). Sizes `md` (44px tall, the touch minimum) and `sm` (32px).
  Also `ButtonLink` for `next/link`. Focus uses `--focus-ring`.
- `Menu.tsx` – a thin wrapper over the existing radix dropdown with
  `bg-raised shadow-menu`, 1px `rule`, square corners, items at `text-ui`.

### Header

- Logo: "baby steps" in the display face, `text-subhead`, `text-accent-ink`.
  Links to today.
- Nav (`lib/nav.ts`): items `today`, `calendar`, `trends`. `calendar` replaces
  the separate week/month entries; the calendar page keeps its own week/month
  switch (plan 09). Update the `Page` type and any switch statements.
  Active item: ink text with a 1px underline offset 6px; inactive `ink-muted`.
- Account: 32px circle avatar (Google photo if present, else first initial on
  `bg-raised`), opens `Menu` with: the email (caption, muted), `settings`
  (placeholder), `sign out`.
- Rule: `border-b border-rule-strong`.
- Theme toggle: per decision 2, remove it from the header. Leave
  `ThemeToggle.tsx` and `lib/theme.ts` in the repo and force light (`.dark`
  never applied) until a dark theme exists. Note this in PROGRESS.

### Phones (≤ 640px)

- Frame padding 14px. Header: logo left, avatar right. Nav moves to
  `BottomNav`, restyled: paper background, 1px `rule-strong` top border, three
  text items with the same active underline, no icons-only buttons.
- Footer stays, under the sheet, above the bottom nav's safe area.

## Verify

- 1440: sheet centred with 44px of frame on every side; footer outside the
  sheet; header rule spans the sheet edge to edge.
- 390: 14px frame, bottom nav reachable, nothing scrolls sideways.
- Keyboard: tab order logo → nav → avatar; menu opens with Enter, closes with
  Esc, focus returns to the avatar.
- `data-frame="espresso"` on `<html>`: footer text turns ivory and stays
  readable.
