# 001 — Fix the cursor field: remove the singularity and the stale centres

- **Status**: DONE
- **Commit**: b8ee038
- **Severity**: HIGH
- **Category**: Physicality & origin / Interruptibility / Correctness
- **Estimated scope**: 1 file, ~30 lines changed

## Problem

`components/auth/PointerNudge.tsx` pushes 26 decorative stickers away from the
cursor on the signed-out page. Three defects make it read as jerky rather than
as water.

### 1. The push is at its maximum exactly where its direction reverses

```ts
// components/auth/PointerNudge.tsx:93-100 — current
if (distance > RADIUS || distance === 0) {
  target.style.translate = "";
  return;
}

const falloff = (1 - distance / RADIUS) ** 2;
const scale = (PUSH * falloff) / distance;
target.style.translate = `${dx * scale}px ${dy * scale}px`;
```

`dx * scale` is `(dx / distance) * PUSH * falloff` — a unit vector times a
magnitude of `PUSH * (1 - d/RADIUS)²`. That magnitude is **largest at `d = 0`**,
which is the same point where the unit vector flips through 180°. Moving the
cursor across a sticker's centre therefore swings its destination from `+22px`
to `-22px` — a 44px jump — in the space of a couple of pixels of cursor travel.
The 900ms transition on `components/auth/FloatingStickers.tsx:575` smears the
jump but cannot remove it, because the *target* is discontinuous.

### 2. Every centre is measured in the wrong place, permanently

```ts
// components/auth/PointerNudge.tsx:65-79 — current
let centres = targets.map(measure);

function measure(target: HTMLElement) {
  const box = target.getBoundingClientRect();
  const current = target.style.translate;
  const [dx = 0, dy = 0] = current
    ? current.split(" ").map((part) => Number.parseFloat(part))
    : [];
  return {
    x: box.left + box.width / 2 - dx,
    y: box.top + box.height / 2 - dy,
  };
}
```

`measure` subtracts the *inline* translate this file wrote, but
`getBoundingClientRect()` also includes every **ancestor** transform. Each
`[data-nudge]` span sits inside an outer span carrying the entrance animation
(`components/auth/FloatingStickers.tsx:567`), and that animation is declared
with `both` (`app/globals.css:135`), so during its `animation-delay` — up to
1060ms — the outer span holds the entrance's first keyframe. At the moment
`useEffect` runs, that is `translate: 0 14px`.

So all 26 centres are recorded 14px below where the stickers actually rest, and
they are never corrected: `remeasure` is wired to `resize` and `scroll`
(`components/auth/PointerNudge.tsx:125-126`) and the layer is `fixed inset-0`,
so it never scrolls. The diagnostic that confirms this: **resize the window once
and the effect visibly improves**, because by then the entrance has settled at
`translate: 0`.

The comment at `components/auth/PointerNudge.tsx:61-63` blames the drift
animation for measurement error. That part is wrong and should be corrected: the
drift runs on a *descendant* of the measured span, and a descendant's transform
does not change its ancestor's border box. The entrance, on an ancestor, does.

This defect gets worse under plan `002`, which increases the entrance's first
keyframe from 14px to 26–34px. **This plan must land first.**

### 3. Hidden stickers are still in the field

Three bands are `display: none` at some viewport sizes
(`components/auth/FloatingStickers.tsx:42, 48, 49`). For those,
`getBoundingClientRect()` returns all zeros, so they are assigned a centre of
`(0, 0)` and receive `style.translate` writes whenever the cursor is near the
top-left corner of the window. Invisible, but it is 5 wasted style writes per
frame and it will become visible the moment anyone gives the layer a background.

### 4. `ease-out` on a per-frame-retargeted transition

```tsx
{/* components/auth/FloatingStickers.tsx:575 — current */}
className={`block transition-[translate] duration-[900ms] ease-out ${floater.tilt ?? ""}`}
```

A CSS transition retargets from its current computed value every time the
destination changes — here, once per animation frame. With `ease-out` each
retarget begins at maximum velocity, so the element tracks the cursor far more
eagerly than "900ms" suggests, and the perceived lag varies with how fast the
cursor is moving. `linear` gives a constant approach rate and therefore a
consistent trail, which is what the file's own comment
(`components/auth/PointerNudge.tsx:19-22`) is asking for.

## Target

```ts
/** How close the cursor has to get before anything moves, in pixels. */
const RADIUS = 240;
/**
 * Peak displacement, in pixels. Reached at `CORE` away from a sticker's centre,
 * not at the centre itself — see `apply`.
 */
const PUSH = 30;
/**
 * The calm spot at each sticker's own centre, roughly one sticker across.
 *
 * Water does not shove hardest directly beneath the thing displacing it; the
 * ridge is *around* it. That is also the only shape that makes this field
 * continuous. Push magnitude has to fall to zero at `d = 0`, because `d = 0` is
 * where the push *direction* reverses, and a maximum sitting on top of a
 * reversal is a `2 * PUSH` jump every time the cursor crosses a sticker.
 */
const CORE = 44;
```

Resulting displacement profile — continuous everywhere, zero at both ends:

| distance from centre | displacement |
| --- | --- |
| 0px | 0px |
| 22px | 12.4px |
| **44px** | **20.0px (peak)** |
| 80px | 13.3px |
| 120px | 7.5px |
| 240px | 0px |

## Repo conventions to follow

- This file is heavily commented in prose that explains *why*, not *what*, and
  documents the failure each choice prevents. Match that register — see
  `components/auth/PointerNudge.tsx:10-30` for the house style. Every comment
  written below is part of the deliverable, not decoration.
- Constants are `SCREAMING_CASE` at module top with a one-line doc comment
  (`components/auth/PointerNudge.tsx:5-8`).
- Tailwind arbitrary values in `className` strings, not inline styles, for
  anything static (`components/auth/FloatingStickers.tsx:575`).

## Steps

1. In `components/auth/PointerNudge.tsx`, replace the `PUSH` constant block
   (lines 7-8) with the `PUSH` and `CORE` declarations from **Target** above,
   comments included.

2. Replace `measure` (lines 53-79, including its doc comment) with a
   layout-based measurement that no transform can contaminate:

   ```ts
   /**
    * Where each target sits when nothing is pushing it, in viewport pixels.
    *
    * Measured from layout — `offsetLeft` / `offsetTop` up the `offsetParent`
    * chain — rather than from `getBoundingClientRect`, and that is a
    * correctness fix rather than a preference. A painted box includes every
    * transform on every ancestor, and each sticker has two of them: the
    * entrance on the span above (which holds its *first* keyframe for up to a
    * second, because it is declared `both`) and the push this file writes
    * itself. Measuring the painted box at mount therefore records all 26
    * centres wherever the entrance happens to be holding them, and nothing
    * ever corrects it. Layout offsets ignore transforms entirely, so this is
    * right on the first frame and stays right.
    *
    * The walk stops *before* the `fixed inset-0` layer rather than including
    * it, which makes the result relative to that layer's padding box — the
    * viewport — without depending on what a fixed element reports for its own
    * `offsetTop`.
    *
    * `null` for a sticker on a `display: none` band: three of them are gated on
    * viewport size (see `BAND` in `FloatingStickers.tsx`) and a hidden element
    * has no offset parent. Without this they would all report a centre of
    * `(0, 0)` and get pushed around the top-left corner of the window.
    */
   function measure(target: HTMLElement) {
     if (target.offsetParent === null) return null;

     let x = target.offsetWidth / 2;
     let y = target.offsetHeight / 2;
     let node: HTMLElement = target;

     while (node.offsetParent) {
       x += node.offsetLeft;
       y += node.offsetTop;
       node = node.offsetParent as HTMLElement;
     }

     return { x, y };
   }
   ```

   Keep `let centres = targets.map(measure);` immediately above it, unchanged.

3. Replace the body of `apply` (lines 85-102) with:

   ```ts
   function apply() {
     frame = 0;
     targets.forEach((target, index) => {
       const centre = centres[index];
       // A band that is hidden at this viewport size.
       if (!centre) return;

       const dx = centre.x - pointerX;
       const dy = centre.y - pointerY;
       const distance = Math.hypot(dx, dy);

       if (distance >= RADIUS || distance === 0) {
         target.style.translate = "";
         return;
       }

       // Two falloffs, multiplied. The squared outer one is what keeps this
       // from reading as a parallax layer: a sticker at the edge of the radius
       // barely stirs and only the near ones really move. The linear inner one
       // is what keeps the field continuous — it takes the magnitude back to
       // zero at the exact point the direction reverses, so crossing a sticker
       // no longer flings it `2 * PUSH` across.
       const outer = (1 - distance / RADIUS) ** 2;
       const inner = Math.min(1, distance / CORE);
       const magnitude = PUSH * outer * inner;

       target.style.translate = `${(dx / distance) * magnitude}px ${(dy / distance) * magnitude}px`;
     });
   }
   ```

4. Remove the `scroll` listener and its cleanup
   (`components/auth/PointerNudge.tsx:126` and `:133`). Layout offsets inside a
   `fixed inset-0` layer do not change when the page scrolls, so re-measuring on
   scroll is now dead work. Leave the `resize` listener — it is what re-measures
   after a viewport-size change reveals or hides a band. Add a one-line comment
   on the resize listener saying exactly that.

5. In `components/auth/FloatingStickers.tsx:575`, change `ease-out` to `linear`
   in the nudge span's className, and replace the comment above it (lines
   569-572) with:

   ```tsx
   {/* The element the cursor moves. `duration-[900ms]` is doing most of the
       work of making it read as water: the script writes a destination and CSS
       takes the better part of a second drifting towards it.

       `linear` rather than `ease-out`, because the destination is rewritten
       every frame and a transition retargets from wherever it currently is. An
       ease-out restarts at full speed on every one of those retargets, so the
       sticker tracks the cursor far more eagerly than 900ms implies and the lag
       changes with how fast you are moving. Linear approaches at a constant
       rate, which is the same trail whatever the cursor does. */}
   ```

6. Correct the stale claim at `components/auth/PointerNudge.tsx:61-63` — the
   sentence blaming the drift animation for measurement error. Drift runs on a
   descendant of the measured span and cannot affect its box; the entrance, on
   an ancestor, is what did. This is covered by the rewritten doc comment in
   step 2; make sure no copy of the old claim survives.

## Boundaries

- Do NOT touch `app/globals.css`, the keyframes, or any duration token — that is
  plans `002` and `003`.
- Do NOT change `RADIUS` (240) or the 900ms transition duration.
- Do NOT change any markup or nesting in `FloatingStickers.tsx`. Step 5 changes
  one word in one className and one comment; nothing else in that file.
- Do NOT add dependencies, and do NOT reach for a spring or animation library —
  this stays a CSS transition steered by a destination.
- If a step does not match the code you find, STOP and report rather than
  improvising.

## Verification

- **Mechanical**: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`
  — all green. `measure` now returns `{ x, y } | null`, so confirm the
  typechecker accepts the `if (!centre) return;` guard in `apply` and that no
  other call site assumes a non-null result.
- **Feel check**: `npm run dev`, open `/login` on a machine with a mouse or
  trackpad, and confirm:
  - Sweep the cursor slowly straight through the middle of any sticker. It
    should ease aside, go still as the cursor passes over it, and ease aside the
    other way. **Before this change it snaps across as the cursor crosses it —
    that snap is the whole bug.**
  - The strongest push happens with the cursor roughly a sticker's width away,
    not on top of it.
  - Load the page and start moving the cursor *immediately*, before the stickers
    have finished arriving. The push should be centred on each sticker from the
    first frame. Then resize the window and sweep again: the behaviour should be
    **identical**, where before the resize measurably improved it.
  - Narrow the window below 1024px so the two `lg:` stickers hide, then move the
    cursor into the top-left corner. Nothing invisible should be moving — check
    in DevTools that no `display: none` span has a `style="translate: …"`.
  - The trail should feel like a constant lag whether you move the cursor
    slowly or whip it across the page.
- **Done when**: crossing a sticker's centre produces no jump at any cursor
  speed, and a fresh page load behaves the same as a resized one.
