# 003 — Give the drift a second axis, and a real reduced-motion resting state

- **Status**: TODO
- **Commit**: b8ee038
- **Severity**: MEDIUM
- **Category**: Physicality & origin / Accessibility
- **Estimated scope**: 3 files, ~60 lines

## Problem

### 1. Twenty-six objects bobbing on one axis, with a dead stop at each end

```css
/* app/globals.css:467-476 — current */
@keyframes drift {
  from {
    translate: 0 -11px;
    rotate: -5deg;
  }
  to {
    translate: 0 11px;
    rotate: 5deg;
  }
}
```

```css
/* app/globals.css:155-156 — current */
--animate-drift: drift var(--drift-dur, 6s) ease-in-out var(--drift-delay, 0s)
  infinite alternate both;
```

Every sticker travels along **exactly the same vector** — straight up, straight
down. Per-sticker periods keep them out of phase with each other, but they are
all performing the same gesture, so the field reads as one animated background
pulsing rather than as two dozen separate objects floating, which is what the
comment at `app/globals.css:150-155` says it is for.

`ease-in-out` with `alternate` compounds it: velocity reaches zero at both
extremes of every cycle, so each sticker visibly **hangs** before reversing.

The amplitude is also large for the job. 22px of total travel on a `size-10`
sticker is 55% of its own diameter, against the keyframe's own stated bar that
"anything you can *watch* is too much" (`app/globals.css:462-464`).

### 2. Under reduced motion, all 26 stickers park 11px low and 5° clockwise

The blanket reduced-motion rule sets `animation-iteration-count: 1` on
everything:

```css
/* app/globals.css:692-696 — current */
  *,
  *::before,
  *::after {
    animation-duration: 1ms !important;
    animation-delay: 0s !important;
    animation-iteration-count: 1 !important;
```

For `drift` that is `alternate` + one iteration + `both`, so the single forward
pass ends on the `to` keyframe and the fill holds it there. Every sticker
therefore comes to rest at `translate: 0 11px; rotate: 5deg` — **shifted down
and tilted the same direction, all 26 of them, identically.**

The comment at `app/globals.css:463-466` claims this "leaves the stickers still,"
which is true and beside the point: still is not the same as *in the right
place*. A uniform 5° tilt across the whole field is exactly the kind of thing
that reads as a rendering bug, and it is the state a reduced-motion visitor sees
every single time. The static per-sticker `tilt`
(`components/auth/FloatingStickers.tsx:146`) is a plain `rotate-*` utility, not
an animation, so it survives correctly — the scatter should stay; only the
animation's residue should go.

## Target

### Two axes, decorrelated

`translate` is a single property, so two simultaneous translations need two
elements. Add a fourth nested span carrying a horizontal drift on its own
period, deliberately non-harmonic with the vertical one (1.37×), so the pair
never visibly re-syncs and each sticker traces a slow open figure instead of a
line.

This also fixes the dead stop for free, without touching `ease-in-out`: the two
axes reach zero velocity at different moments, so the object as a whole never
stops even though each axis does.

Amplitudes come down at the same time — ±7px vertical, ±5px horizontal, ±3.5°
rotation — because two axes of movement read as more motion than one at the same
distance.

```css
/* app/globals.css — replacing the current `drift` keyframe */
@keyframes drift {
  from {
    translate: 0 -7px;
    rotate: -3.5deg;
  }
  to {
    translate: 0 7px;
    rotate: 3.5deg;
  }
}

/* The other half of the drift. Splitting the two axes across two elements is
   not tidiness — `translate` is one property, so a second animation on the same
   span would simply win and the vertical drift would vanish with no error
   anywhere to say why.

   The periods are deliberately not multiples of each other (each is 1.37× its
   sticker's vertical one), which is what turns two bobs into a slow open figure
   that never repeats visibly. It also removes the hang at the ends of the
   cycle: `ease-in-out` with `alternate` brings each axis to a stop at its
   extremes, and two axes stopping at different moments means the object itself
   never does. */
@keyframes drift-x {
  from {
    translate: -5px 0;
  }
  to {
    translate: 5px 0;
  }
}
```

```css
/* app/globals.css @theme — after `--animate-drift` */
  --animate-drift-x: drift-x var(--drift-x-dur, 8s) ease-in-out
    var(--drift-x-delay, -1s) infinite alternate both;
```

### An explicit reduced-motion rule

```css
/* app/globals.css — inside the existing `@media (prefers-reduced-motion: reduce)`
   block, after the blanket `*` rule */

  /* The drift needs its own rule, and it is the one animation in this app that
     does. The blanket rule above stops everything by flattening the duration
     and capping the iteration count at one — which for an `alternate` animation
     with `both` means a single forward pass that finishes on the *last*
     keyframe and stays there. Every other animation in this file ends where the
     element belongs, so that is the right answer for all of them. The drift
     ends 7px down and 3.5° over, so capping it would park all twenty-six
     stickers below their positions and tilted the same way — still, but visibly
     wrong, and wrong in a way that reads as a bug rather than as a preference
     being honoured.

     `animation: none` instead: no animation, so the elements sit where layout
     puts them. The per-sticker `tilt` and `offset` are ordinary utilities
     rather than animations, so the field keeps its scatter and only loses its
     movement — which is precisely what the request asks for.

     Class specificity beats `*`, so this wins the `!important` contest against
     the blanket rule above. */
  .animate-drift,
  .animate-drift-x {
    animation: none !important;
  }
```

### Per-sticker horizontal clocks

A new `driftX` field on `Floater`, one literal per sticker:

| name | `driftX` |
| --- | --- |
| Wind down | `"[--drift-x-dur:10.7s] [--drift-x-delay:-0.4s]"` |
| Take a photo | `"[--drift-x-dur:12.6s] [--drift-x-delay:-2.3s]"` |
| Eat an apple | `"[--drift-x-dur:9.2s] [--drift-x-delay:-4.2s]"` |
| Drink water | `"[--drift-x-dur:9.5s] [--drift-x-delay:-6.1s]"` |
| Sweep up | `"[--drift-x-dur:8.8s] [--drift-x-delay:-8s]"` |
| Rest day | `"[--drift-x-dur:11.5s] [--drift-x-delay:-9.9s]"` |
| Eat something green | `"[--drift-x-dur:9.7s] [--drift-x-delay:-3s]"` |
| Practice | `"[--drift-x-dur:9.9s] [--drift-x-delay:-4.7s]"` |
| Walk | `"[--drift-x-dur:11.2s] [--drift-x-delay:-5.3s]"` |
| Listen to a record | `"[--drift-x-dur:9.3s] [--drift-x-delay:-0.7s]"` |
| Make tea | `"[--drift-x-dur:10.5s] [--drift-x-delay:-9.8s]"` |
| Watch something | `"[--drift-x-dur:12.2s] [--drift-x-delay:-10s]"` |
| Tidy up | `"[--drift-x-dur:9s] [--drift-x-delay:-7s]"` |
| Ride | `"[--drift-x-dur:8.5s] [--drift-x-delay:-2.3s]"` |
| Run | `"[--drift-x-dur:9.6s] [--drift-x-delay:-0.9s]"` |
| Cook a real meal | `"[--drift-x-dur:12.1s] [--drift-x-delay:-6.5s]"` |
| Sit outside | `"[--drift-x-dur:13.4s] [--drift-x-delay:-5.8s]"` |
| Early night | `"[--drift-x-dur:11s] [--drift-x-delay:-2.4s]"` |
| Stretch | `"[--drift-x-dur:10.1s] [--drift-x-delay:-7s]"` |
| Call home | `"[--drift-x-dur:11.8s] [--drift-x-delay:-3.8s]"` |
| Bake | `"[--drift-x-dur:10.4s] [--drift-x-delay:-0.4s]"` |
| Write it down | `"[--drift-x-dur:13s] [--drift-x-delay:-4s]"` |
| Read | `"[--drift-x-dur:11.6s] [--drift-x-delay:-10.1s]"` |
| Coffee with a friend | `"[--drift-x-dur:10.3s] [--drift-x-delay:-6.5s]"` |
| Make something | `"[--drift-x-dur:8.9s] [--drift-x-delay:-6s]"` |
| Water the plants | `"[--drift-x-dur:12.3s] [--drift-x-delay:-2.3s]"` |

**Every one of those delays is negative, and that is not a typo** — it is the
same rule `--animate-drift` already documents at `app/globals.css:145-152`. A
positive delay makes the element sit at its layout position and then jump to the
first keyframe when the clock runs out; a negative one starts the animation
already in progress, so nothing waits and nothing snaps. Each is also smaller in
magnitude than its own period, so every sticker starts somewhere different
inside its cycle.

## Repo conventions to follow

- Per-sticker animation clocks are Tailwind arbitrary *properties* on the
  element, read by a keyframe through `var()` with a fallback — the existing
  `drift` field at `components/auth/FloatingStickers.tsx:110-111` and its use at
  `:578` are the exemplar. Copy that shape exactly for `driftX`.
- `--animate-*` entries live in `@theme`; the keyframes they name live in the
  keyframes section further down the file, which carries a comment
  (`app/globals.css:418-421`) explaining that hand-written rules are invisible
  to Tailwind's scanner.
- Every class is a literal in the source. `[--drift-x-dur:${n}s]` built in a
  loop compiles to nothing and all 26 would silently share the 8s fallback.
- Fields on `Floater` carry a doc comment saying what they are for
  (`components/auth/FloatingStickers.tsx:97-147`).

## Steps

1. In `app/globals.css`, replace the `drift` keyframe (lines 467-476) with the
   reduced-amplitude version from **Target**, and add the `drift-x` keyframe with
   its comment directly after it.

2. In the `@theme` block, add `--animate-drift-x` from **Target** immediately
   after `--animate-drift` (which ends at line 156).

3. Update the `--animate-drift` comment (lines 137-155) where it describes the
   drift as the only thing moving the sticker — there are two axes now, on two
   elements, for the reason the `drift-x` keyframe comment gives. Keep the
   negative-delay paragraph verbatim; it still applies to both.

4. Add the reduced-motion rule from **Target** inside the existing
   `@media (prefers-reduced-motion: reduce)` block, after the `*` rule that ends
   at line 700 and before the `::view-transition-*` rule. Include the comment.

5. Also update the note inside the `drift` keyframe comment
   (`app/globals.css:463-466`) that currently says reduced motion "needs no rule
   of its own." It does now, and step 4 is it — point at it rather than deleting
   the paragraph.

6. In `components/auth/FloatingStickers.tsx`, add a `driftX` field to the
   `Floater` type immediately after `drift` (line 111):

   ```ts
   /** Its own horizontal clock — see `--animate-drift-x` in globals.css. */
   driftX: string;
   ```

7. Add the matching `driftX` value to all 26 entries in `FLOATERS`, from the
   table in **Target**, matched by `name`. Put it on the line after each `drift`.
   All 26 are required — the field is not optional, so the typechecker will
   catch a miss.

8. In the render (lines 577-588), wrap `StickerMark` in a fourth span carrying
   the horizontal drift. The vertical drift keeps the `offset` margin; the new
   span carries nothing but its own animation:

   ```tsx
   <span
     className={`animate-drift block ${floater.drift} ${floater.offset ?? ""}`}
   >
     <span className={`animate-drift-x block ${floater.driftX}`}>
       <StickerMark
         sticker={{
           name: floater.name,
           mark: floater.mark,
           colorKey: floater.colorKey,
         }}
         className={floater.size}
       />
     </span>
   </span>
   ```

9. Update the "Three nested spans, three animations, and that's the minimum"
   paragraph in the `FloatingStickers` doc comment
   (`components/auth/FloatingStickers.tsx:542-548`). It is four spans and four
   animations now, and the reason is the same one it already gives: an element
   has one `translate`, and the drift needs two.

## Boundaries

- Do NOT put the horizontal drift on `StickerMark` via its `className` prop.
  That prop is documented as size and type-scale only
  (`components/calendar/StickerMark.tsx:7-19`) and it is shared with the
  calendar, the tray and the day modal. Add the span.
- Do NOT change `--drift-dur` or `--drift-delay` on any sticker — the vertical
  clocks stay exactly as they are. Only amplitudes change on that axis.
- Do NOT remove or weaken the blanket `*` reduced-motion rule; the new rule is an
  addition that overrides it for two classes.
- Do NOT change `ease-in-out` on either drift. The hang is fixed by the two axes
  being out of phase, not by the curve.
- Do NOT touch the entrance (plan `002`) or `PointerNudge.tsx` (plan `001`).
- If a step does not match the code you find, STOP and report rather than
  improvising.

## Verification

- **Mechanical**: `npx tsc --noEmit` (this is the check that catches a missing
  `driftX` — the field is required), `npm run lint`, `npm test`,
  `npm run build`. Then confirm the classes compiled:
  `grep -c 'drift-x-dur' .next/static/css/*.css` should be non-zero, and
  `grep -o '@keyframes drift-x' .next/static/css/*.css` should hit. If
  `--drift-x-dur` is missing from the CSS, a value is being assembled rather
  than written literally.
- **Feel check**: `npm run dev`, open `/login`, and confirm:
  - Watch one sticker for a full 15 seconds. It should trace a slow open loop,
    not a vertical line, and it should **never fully stop**. If it pauses at the
    top and bottom, the two periods are harmonically related — check that
    `--drift-x-dur` is not a whole multiple of `--drift-dur` for that sticker.
  - Unfocus your eyes and look at the whole field. It should read as separate
    objects, not as one background pulsing.
  - The motion should be quieter than before. If it is more noticeable, the
    amplitudes did not come down — check the `drift` keyframe is ±7px/±3.5°.
  - Nothing should have moved position: the amplitude change is symmetric about
    the resting spot, so the layout is identical.
  - **The reduced-motion check is the important one here.** DevTools →
    Rendering → "Emulate prefers-reduced-motion: reduce", hard-reload, and
    confirm the stickers are still **and upright and at their resting
    positions**. Compare against the current build, where all 26 sit 11px low
    and tilted 5° clockwise. The per-sticker `tilt` (`rotate-3`, `-rotate-6`)
    must still be visible — that is scatter, not motion, and it stays.
  - Performance: with the cursor moving continuously across the page, record a
    few seconds in DevTools → Performance. This adds 26 elements and 26 infinite
    animations to a page that already had 78 of them. Expect a steady 60fps with
    work on the compositor. If frames drop, report it rather than tuning — the
    fix is fewer stickers, which is a design decision, not an executor's.
- **Done when**: no sticker's motion is describable as "up and down," the field
  never pulses in unison, and a reduced-motion visitor sees 26 still, upright,
  correctly-placed stickers.
