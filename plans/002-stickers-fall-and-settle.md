# 002 — Make the stickers fall in and settle, instead of popping

- **Status**: DONE
- **Commit**: b8ee038
- **Severity**: HIGH
- **Category**: Physicality & origin / Cohesion
- **Estimated scope**: 2 files, ~60 lines

## Problem

The 26 decorative stickers on the signed-out page arrive with `animate-rise` —
the same animation as the heading, the tagline and the sign-in buttons.

```css
/* app/globals.css:135 — current */
--animate-rise: rise var(--dur-hero) var(--ease-enter) both;
```

```css
/* app/globals.css:448-457 — current */
@keyframes rise {
  from {
    opacity: 0;
    translate: 0 14px;
  }
  to {
    opacity: 1;
    translate: 0 0;
  }
}
```

```tsx
{/* components/auth/FloatingStickers.tsx:567 — current */}
className={`animate-rise absolute ${floater.position} ${ARRIVAL.get(floater.name) ?? ""}`}
```

Two things are wrong with that.

**It is the wrong curve for 26 small objects.** `--ease-enter` is
`cubic-bezier(0.16, 1, 0.3, 1)` (`app/globals.css:119`) — an expo-out that
covers roughly 90% of its distance in the first 40% of its time. Over 14px at
`--dur-hero: 300ms` (`app/globals.css:211`) each sticker is visually finished in
about 120ms with a long invisible tail. On one heading that reads as decisive.
On 26 circles arriving 20ms apart (`components/auth/FloatingStickers.tsx:478-491`)
it is popcorn — which is the "chunky" complaint.

**It is the wrong gesture.** `rise` is a text entrance: 14px of upward travel
carrying a fade, deliberately small so the words are never legibly in the wrong
place first (`app/globals.css:441-447`). A sticker is not a word. It is a small
round physical object, and the app already has a vocabulary for one of those
arriving — `land`, at `app/globals.css:425`, which is what a mark does when it
is dropped on a Tuesday. The login page should be recognisably the same world.

## Target

The stickers **fall** from above, plunge slightly past their resting place, and
rock back a couple of times before settling — an object dropped onto water. The
heading, tagline and buttons keep `animate-rise` unchanged: the content asserts
itself upward, the decoration drops in around it.

Three properties make it read as falling rather than as sliding:

- **The descent accelerates.** `cubic-bezier(0.11, 0, 0.5, 0)` is ease-in-quad,
  which is literally the displacement curve of a falling body. Note that
  ease-in on UI is normally a defect — it delays the moment the user is
  watching — but this is decorative motion depicting gravity on a page whose
  interactive controls are already live. **Do not "fix" this to an ease-out.**
- **It overshoots and oscillates.** Plunge to +21% of the drop height, rebound
  to −11%, then +4.5%, then rest. Each half-swing gets an equal slice of time,
  because a damped oscillator has a constant period.
- **It is opaque before it lands.** The fade finishes in the first 30% of the
  animation, so you watch a visible object fall rather than one materialising
  in place.

### New token, in `:root` alongside the other durations

```css
  /* The stickers dropping onto the signed-out page — see `--animate-fall`.

     Longer than `--dur-hero`, and it has to be: this one is not a fade with a
     nudge, it is a fall, an overshoot and two rebounds, and each of those needs
     enough time to be seen as a separate event. Under 500ms the settle stops
     reading as a settle and starts reading as a wobble.

     The cost is paid entirely by decoration. The buttons are pressable at 450ms
     and the sticker layer is `pointer-events-none` from the first frame, so
     nothing here is ever between the visitor and the thing they came to press.
     The last sticker now lands at 1060ms + 620ms = 1680ms, on purpose. */
  --dur-fall: 620ms;
```

### New `@theme` entries, next to `--animate-rise`

```css
  /* The stickers arriving on the signed-out page. Two animations rather than
     one, because the fall and the reveal are different lengths: the fade is
     over in the first third so that what you watch descend is a solid object
     rather than one developing in mid-air. Comma-separated the same way the
     `::view-transition-*` rules further down this file stack a slide on a fade.

     `both` on each, for the reason `--animate-rise` documents: the stagger only
     works if an element holds its first keyframe through its delay.

     No timing function in the shorthand — `fall` sets one per keyframe,
     because a single curve cannot both accelerate into the impact and
     oscillate out of it. */
  --animate-fall:
    fall var(--dur-fall) both,
    sticker-fade calc(var(--dur-fall) * 0.3) linear both;
```

### New keyframes, next to `rise`

```css
/* A sticker dropping onto the signed-out page and settling like something
   landing on water: it falls, plunges past where it belongs, and rocks back
   twice before it stops.

   The distance is `--fall-drop` rather than a literal, the same way
   `deck-slide` reads `--deck-offset`, so the big stickers can fall further than
   the small ones without four near-identical keyframe blocks drifting apart.
   Every other stop is a fraction of it, so re-tuning the drop re-tunes the
   whole bounce in proportion.

   The per-keyframe `animation-timing-function` is the load-bearing part, and it
   is worth knowing that a keyframe's timing function governs the segment that
   *starts* at it, not the one that ends there. The first segment is the fall
   and accelerates — ease-in-quad is the displacement curve of a falling body,
   and it is the one place in this app where an ease-in is correct rather than a
   mistake. The three after it are half-swings of an oscillation, so they take a
   symmetric sine-like curve instead.

   Reduced motion needs no rule of its own: the blanket block at the bottom of
   this file flattens the duration to 1ms, and `both` holds the final keyframe,
   which is the resting position. */
@keyframes fall {
  0% {
    translate: 0 calc(var(--fall-drop, 28px) * -1);
    animation-timing-function: cubic-bezier(0.11, 0, 0.5, 0);
  }
  35% {
    translate: 0 calc(var(--fall-drop, 28px) * 0.21);
    animation-timing-function: cubic-bezier(0.45, 0, 0.55, 1);
  }
  58% {
    translate: 0 calc(var(--fall-drop, 28px) * -0.11);
    animation-timing-function: cubic-bezier(0.45, 0, 0.55, 1);
  }
  78% {
    translate: 0 calc(var(--fall-drop, 28px) * 0.045);
    animation-timing-function: cubic-bezier(0.45, 0, 0.55, 1);
  }
  100% {
    translate: 0 0;
  }
}

/* The sticker becoming visible, on its own clock so it can finish long before
   the fall does. Separate from `fall` rather than an extra pair of stops inside
   it, because an opacity keyframe in the middle of the descent would split the
   gravity curve into two shallower ones. */
@keyframes sticker-fade {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
```

### Drop heights by size, in `FloatingStickers.tsx`

```ts
/**
 * How far each sticker falls, by size — see `fall` in globals.css.
 *
 * A bigger thing displaces more when it lands, so it gets further to fall and a
 * proportionally deeper plunge. The keyframe reads this as `--fall-drop` and
 * derives its whole bounce from it, so these four numbers are the only knob.
 *
 * Written out in full for the reason every other class in this file is: Tailwind
 * scans source text, so `[--fall-drop:${n}px]` assembled at runtime compiles to
 * nothing and every sticker would silently fall the default 28px instead.
 */
const DROP: Record<string, string> = {
  "size-14": "[--fall-drop:34px]",
  "size-12": "[--fall-drop:31px]",
  "size-11": "[--fall-drop:29px]",
  "size-10": "[--fall-drop:26px]",
};
```

## Repo conventions to follow

- Duration tokens are real custom properties in `:root`, **not** `@theme`
  entries, because the reduced-motion block rewrites them and an `inline` theme
  value is substituted at build time with nothing left to override — see the
  comment at `app/globals.css:196-200` and the `--dur-hero` block at `:203-211`.
- `--animate-*` entries live in `@theme` and reference those tokens —
  `--animate-rise` at `app/globals.css:135` is the exemplar.
- A keyframe parameterised by a custom property rather than duplicated per case:
  `deck-slide` reading `--deck-offset`, `app/globals.css:478-489`.
- Every Tailwind class is written out literally; nothing is assembled from
  pieces at runtime. `X`, `BAND` and `ENTER` in
  `components/auth/FloatingStickers.tsx:39-84, 461-492` all say why.
- Lookup by size prefix uses the existing `rank()` shape,
  `components/auth/FloatingStickers.tsx:522-525`.

## Steps

1. In `app/globals.css`, add the `--dur-fall: 620ms;` block from **Target**
   immediately after the `--dur-hero` block (which ends at line 211), inside the
   same `:root`.

2. Add `--dur-fall: 1ms;` to the reduced-motion `:root` block
   (`app/globals.css:680-688`), on the line after `--dur-hero: 1ms;`.

3. In the `@theme` block, add the `--animate-fall` entry from **Target**
   immediately after `--animate-rise` (line 135). Leave `--animate-rise` itself
   completely unchanged — the heading, tagline and buttons still use it.

4. Add the `fall` and `sticker-fade` keyframes from **Target** immediately after
   the `rise` keyframe block (which ends at line 457).

5. In `components/auth/FloatingStickers.tsx`, add the `DROP` map from **Target**
   immediately after `SIZE_ORDER` (line 495).

6. Add a lookup helper beside `rank()` (line 522):

   ```ts
   function drop(size: string) {
     const found = Object.keys(DROP).find((name) => size.startsWith(name));
     return found ? DROP[found] : "";
   }
   ```

   An unrecognised size falls the keyframe's own 28px default rather than
   crashing, which matches how `ARRIVAL` handles a 27th sticker
   (`components/auth/FloatingStickers.tsx:517-519`).

7. In the render (line 567), change `animate-rise` to `animate-fall` and add the
   drop class:

   ```tsx
   className={`animate-fall absolute ${floater.position} ${drop(floater.size)} ${ARRIVAL.get(floater.name) ?? ""}`}
   ```

8. Update the comment block on `FloatingStickers` (lines 542-548) where it says
   "the entrance rises it into place" — it falls now. Keep the surrounding
   explanation of why three nested spans are the minimum; only the word for the
   gesture changes.

9. Update the entrance paragraph in the `app/login/page.tsx` file comment (lines
   ~15-22 of the doc block) if it describes the stickers as rising. The heading,
   tagline and buttons still rise; only the stickers fall. Leave the `ENTER`
   delays in `FloatingStickers.tsx` untouched — a long tail is intended here,
   because the layer is `pointer-events-none` and the buttons are live at 450ms.

## Boundaries

- Do NOT change `--dur-hero`, `--animate-rise`, or the `rise` keyframe. The
  heading, tagline and buttons are out of scope.
- Do NOT change the `ENTER` delay array or shorten the stagger. The long tail is
  a deliberate decision: slow arrival is fine because nothing decorative can
  intercept a click.
- Do NOT change `--ease-enter`, `--ease-exit` or `--ease-deck`, and do NOT add
  the fall's curves as global easing tokens — they are specific to this one
  keyframe and belong inside it.
- Do NOT touch `PointerNudge.tsx` (plan `001`) or the drift keyframes (plan `003`).
- Do NOT add dependencies or a spring library.
- If a step does not match the code you find, STOP and report rather than
  improvising.

## Verification

- **Mechanical**: `npx tsc --noEmit`, `npm run lint`, `npm test`,
  `npm run build` — all green. Then confirm the new classes actually compiled,
  the way this repo has checked every previous motion change:
  `grep -o 'animate-fall\|--fall-drop:34px\|--fall-drop:26px' .next/static/css/*.css`
  should hit all three. If `--fall-drop` is missing, the `DROP` map is being
  assembled rather than written literally — go back to step 5.
- **Feel check**: `npm run dev`, open `/login`, hard-reload, and confirm:
  - Each sticker **drops in from above**, dips slightly past where it ends up,
    and rocks back before settling. In DevTools → Animations, set playback to
    10% and watch a single `size-14` sticker: you should see four distinct
    phases — accelerating fall, plunge, rebound, small second rebound.
  - It is fully opaque well before it reaches its resting place. If it is still
    fading in as it lands, the `sticker-fade` duration multiplier is wrong.
  - The descent gets **faster** as it goes. If it starts fast and eases in, the
    per-keyframe timing functions are on the wrong keyframes — remember a
    keyframe's timing function governs the segment starting at it.
  - The big stickers visibly fall further and plunge deeper than the small ones.
  - Nothing pops. Compare against the current build: the popcorn quality in the
    last 14 stickers should be gone even though they still arrive 20ms apart.
  - **Click a sign-in button at ~500ms, while stickers are still falling.** It
    must respond normally — this is the constraint that makes the long tail
    acceptable.
  - Toggle Rendering → "Emulate prefers-reduced-motion: reduce" and hard-reload:
    all 26 stickers should be present, still, and at their resting positions
    with no residual offset.
- **Done when**: a sticker reads as an object dropped onto water rather than as
  a circle fading in, and the page is fully interactive before the first sticker
  has landed.
