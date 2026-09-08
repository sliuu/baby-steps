"use client";

import { useEffect, useRef, type ReactNode } from "react";

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

/**
 * Pushes anything marked `data-nudge` gently away from the cursor.
 *
 * Water, not magnetism. Three choices make it read that way rather than as a
 * UI reacting to you:
 *
 * - **Two falloffs, multiplied.** The squared outer one means a sticker at the
 *   edge of the radius barely stirs and only the nearest ones really move;
 *   linear falloff makes the whole field slide at once, which reads as a
 *   parallax layer. The linear inner one hands the sticker's own centre back to
 *   it, which is what keeps the field continuous — see `CORE`.
 * - **A long transition on the element, not per-frame positioning.** The class
 *   is `duration-[900ms]`, so what this file writes is a *destination* and CSS
 *   spends most of a second easing towards it. That lag is the entire effect —
 *   set it to 0 and the stickers snap to the cursor like a menu.
 * - **It never returns anything to exactly where it started in a hurry.**
 *   Leaving the radius clears the translate and the same 900ms carries it home.
 *
 * The children stay server-rendered. This wraps them in a `display: contents`
 * div and finds its targets by attribute, so the sticker markup, the colours
 * and the array of positions never reach the browser bundle — only the twenty
 * lines of maths below do.
 */
export function PointerNudge(props: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = root.current;
    if (!node) return;

    // No cursor, no nudge. On a touch screen `pointermove` fires only during a
    // drag, so the effect would be invisible except as a strange lurch under
    // the thumb — and it would cost every visitor the listener regardless.
    if (!window.matchMedia("(hover: hover)").matches) return;
    // Reduced motion is honoured by not running at all. The global CSS override
    // would flatten the transition to 1ms, which doesn't remove the movement,
    // it removes the *easing* — the stickers would teleport, which is worse
    // than either alternative.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const targets = Array.from(
      node.querySelectorAll<HTMLElement>("[data-nudge]"),
    );
    if (targets.length === 0) return;

    let centres = targets.map(measure);

    /**
     * Where each target sits when nothing is pushing it, in viewport pixels.
     *
     * Measured from layout — `offsetLeft` / `offsetTop` up the `offsetParent`
     * chain — rather than from `getBoundingClientRect`, and that is a
     * correctness fix rather than a preference. A painted box includes every
     * transform on every ancestor, and each sticker has two of them: the
     * entrance on the span above (which holds its *first* keyframe for up to a
     * second, because it is declared `both`) and the push this file writes
     * itself. Measuring the painted box at mount therefore records all
     * twenty-six centres wherever the entrance happens to be holding them —
     * a whole drop height out — and nothing ever corrects it. The giveaway was
     * that resizing the window made the effect better, because by then the
     * entrance had settled. Layout offsets ignore transforms entirely, so this
     * is right on the first frame and stays right.
     *
     * An earlier comment here blamed the drift animation for the same error.
     * That was wrong: drift runs on a *descendant* of the measured span, and a
     * descendant's transform does not change its ancestor's border box. The
     * entrance, on an ancestor, does.
     *
     * The walk stops *before* the `fixed inset-0` layer rather than including
     * it, which makes the result relative to that layer's padding box — the
     * viewport — without depending on what a fixed element reports for its own
     * `offsetTop`.
     *
     * `null` for a sticker on a `display: none` band: three of them are gated
     * on viewport size (see `BAND` in `FloatingStickers.tsx`) and a hidden
     * element has no offset parent. Without this they would all report a centre
     * of `(0, 0)` and get pushed around the top-left corner of the window.
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

    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;

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

    function onMove(event: PointerEvent) {
      pointerX = event.clientX;
      pointerY = event.clientY;
      // One update per frame however many events arrive. `pointermove` can fire
      // faster than the display refreshes on a high-polling-rate mouse.
      if (!frame) frame = requestAnimationFrame(apply);
    }

    function release() {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      for (const target of targets) target.style.translate = "";
    }

    function remeasure() {
      centres = targets.map(measure);
    }

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("blur", release);
    document.addEventListener("pointerleave", release);
    // Resize only. A width or height change moves the columns and reveals or
    // hides the size-gated bands, so the centres genuinely move. Scroll used to
    // be here too and no longer is: these are layout offsets inside a
    // `fixed inset-0` layer, which scrolling does not change.
    window.addEventListener("resize", remeasure);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("blur", release);
      document.removeEventListener("pointerleave", release);
      window.removeEventListener("resize", remeasure);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={root} className="contents">
      {props.children}
    </div>
  );
}
