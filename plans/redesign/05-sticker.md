# 05 · The sticker: solid ink, paper edge, icon colour

- **Status:** TODO
- **Commit:** —
- **Severity:** high (the product's main object)
- **Category:** component
- **Estimated scope:** `components/calendar/StickerMark.tsx`, `lib/stickers.ts`, `lib/icons.ts`, globals.css size tokens

## Problem

`StickerMark.tsx` (138 lines) draws a pale tinted circle (ramp `-tint`) with
`--sticker-edge` white and `--sticker-shadow`. The new sticker is a **solid**
circle in the category ink with a die-cut paper edge.

## Target

One component, used everywhere a sticker appears (today, day sheet, calendar
cell, tray, onboarding, flower legend, design page).

Anatomy, outside in:
1. Faint ring: 1px `rule` circle just outside the edge (reads as the die cut).
2. Paper edge: 3px `paper` border (2px at `xs`).
3. Fill: `bg-cat-<key>`.
4. Icon or mark centred, coloured `text-cat-<key>-on`, stroke 1.5.

Size tokens (globals.css + bridge as `--size-sticker-*` so `size-sticker-lg`
works):

| Token | px | Where |
| --- | --- | --- |
| `--sticker-lg` | 64 | today's stickers |
| `--sticker-md` | 44 | selected day panel, onboarding |
| `--sticker-sm` | 36 | tray (30–42 range; pick 36) |
| `--sticker-xs` | 20 | calendar cell |

API:

```tsx
<StickerMark
  colorKey="sage"          // CategoryColor
  mark="🍝" | icon="dumbbell"
  size="lg" | "md" | "sm" | "xs"
  label="pasta night"      // used for aria-label; omit when a visible name sits next to it
/>
```

- Icon size is a fixed fraction of the sticker (≈ 0.5), computed from the size
  prop, replacing `MARK_ICON_SIZE` in `lib/icons.ts`.
- Emoji marks render at the same box; they ignore the `on` colour.
- No drop shadow. Hover/drag state (in the tray) lifts by `translateY(-1px)`
  with the existing motion tokens; the "land/fall" animations from plan 002
  stay as they are.
- Keep `StickerFace` in `lib/stickers.ts` only if something still needs it;
  otherwise mark it for plan 15.

Why `on` is a token and not computed: the rule (ivory icon if the ink's
lightness ≤ 48%, else ink) was applied once by hand when choosing the six
colours. If a seventh colour is ever added, decide its `on` the same way and
write it in the token table.

> **Amended (as built):**
> - The API keeps `sticker: StickerFace` (name, mark, colour) and adds `size`. Callers already pass that object, and the mark string already says icon or emoji.
> - Sizes are `--size-sticker-*` in the `@theme` bridge (Tailwind's `size-*` namespace), not `:root` vars. The default is `sm`.
> - The icon is `size-1/2`; the emoji is 40% of the sticker via container units (`sticker-glyph`), so off-scale login stickers scale too.
> - `MARK_ICON_SIZE` stays for `StickerBar`, `StickerFields` and `MarkPicker` (plan 09/15). `StickerFace` stays (used across drag and changes).
> - Where each size is used: xs = month and week-column cells and the 404 page; md = day sheet; sm = tray, drag overlay, phone week list, "most marked" and Trends habits. lg waits for plan 08's Today.

## Verify

- Add a `StickerMark` section to `/dev/system` (plan 14) showing all six × four
  sizes. Until that exists, check on today and the tray.
- Contrast: icon on mustard/rose/sage is ink; on oxblood/bottle/plum is ivory.
- Calendar cell at 20px is still identifiable (colour + tiny icon).
- `npm test` (stickers tests).
