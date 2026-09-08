# Animation plans — the signed-out page

Findings from an `improve-animations` audit of `/login` at commit `b8ee038`.
Everything below is scoped to the signed-out page's motion; nothing touches the
app behind it.

## Plans

| # | Title | Severity | Status |
| --- | --- | --- | --- |
| [001](001-fix-pointer-nudge-field.md) | Fix the cursor field: remove the singularity and the stale centres | HIGH | DONE |
| [002](002-stickers-fall-and-settle.md) | Make the stickers fall in and settle, instead of popping | HIGH | DONE |
| [003](003-two-axis-drift-and-reduced-motion.md) | Give the drift a second axis, and a real reduced-motion resting state | MEDIUM | DONE |

## Order

**001 → 002 → 003.**

The only hard dependency is **001 before 002**. `PointerNudge` currently measures
each sticker's centre from its painted box, which includes the entrance
animation's held first keyframe — today that is a 14px error, and plan 002
raises the entrance's starting offset to 26–34px, so shipping 002 first would
make the cursor field visibly worse before it got better. 001 replaces the
measurement with layout offsets, which no entrance can contaminate, and is
therefore correct for whatever 002 does afterwards.

003 is independent of both and can be done at any point, but it is last because
it is the one whose result genuinely cannot be judged from the diff — a 10-second
loop has to be watched.

## File overlap

| File | 001 | 002 | 003 |
| --- | --- | --- | --- |
| `components/auth/PointerNudge.tsx` | ● | | |
| `components/auth/FloatingStickers.tsx` | one class + comments | ● | ● |
| `app/globals.css` | | ● | ● |
| `app/login/page.tsx` | | comment only | |

001 and 002 touch different parts of `FloatingStickers.tsx` (line 575 vs. line
567 and the constants above it) and will not conflict. 002 and 003 touch
different regions of `globals.css` — 002 works on `--dur-*`, `--animate-fall` and
the `rise`/`fall` keyframes; 003 works on `--animate-drift*`, the `drift`
keyframes and the reduced-motion block.

## Deliberately not in scope

- **Compressing the entrance stagger.** The audit flagged that the last 14
  stickers arrive between 800ms and 1360ms — after the buttons are pressable at
  450ms. Stephanie's call is that a slow arrival is fine as long as the page is
  clickable before it finishes, which it is: the layer is `pointer-events-none
  fixed -z-10` from the first frame. Plan 002 keeps the `ENTER` array untouched
  and pushes the final landing to ~1680ms on purpose. Plan 002's feel check
  includes clicking a button mid-entrance to hold that line.
- **`SignInButtons` polish** — no press feedback, the pending label teleports,
  the error `<p role="alert">` appears with no transition
  (`components/auth/SignInButtons.tsx:54, 64, 68`). Real, and a separate plan if
  wanted; it is about the buttons, not the sticker field.
- **The 1px ring at 56px.** `StickerMark` draws `border` at every size
  (`components/calendar/StickerMark.tsx:50`). Correct at 26px in a day cell;
  at `size-14` the tint dominates and the sticker reads as a pale blob rather
  than an outlined mark. This is likely part of "chunky" but it is a visual
  decision about a shared component, not a motion fix.
