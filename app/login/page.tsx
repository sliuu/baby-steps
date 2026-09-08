import { FloatingStickers } from "@/components/auth/FloatingStickers";
import { SignInButtons } from "@/components/auth/SignInButtons";

/**
 * The signed-out page. A name, a sentence, and two buttons.
 *
 * It had an eyebrow above the title — "A quiet ledger of days" — which said
 * roughly what the paragraph below the title already says, in smaller letters,
 * before you'd got to the name of the thing. Two subtitles around one title is
 * one subtitle too many, and the one that went is the one you read first.
 *
 * The staggered entrance is the only decorative motion in the app, and it can
 * afford to be: this is a page with nothing to do on it, seen once, where the
 * arrival *is* the content. Everywhere else motion exists to explain a change
 * — a dialog opening, a month stepping sideways, a mark landing on a Tuesday.
 *
 * The three elements here `rise`; the stickers behind them `fall`. That is not
 * an inconsistency, it's the distinction — words settle up into place, and a
 * small round object drops, overshoots and rocks back. See `fall` in
 * `globals.css`.
 *
 * **The page arrives in two beats.** The three text elements rise together as
 * one block and are done at 420ms; the stickers then cascade in behind them
 * from 420ms to 2924ms. They used to interleave — the tagline 80ms behind the
 * heading, the buttons 80ms behind that, the first sticker landing while the
 * buttons were still moving — and the two readings are genuinely different.
 * Staggered, the page assembles itself a piece at a time. Together, the thing
 * you came for is simply *there*, and the decoration arrives afterwards as
 * decoration. The second is the one this page wants: there is nothing to do
 * here but read two lines and press a button.
 *
 * The handoff is deliberately seamless rather than a pause — the first sticker
 * starts moving on the exact frame the text stops. To overlap the two beats
 * instead, shift every delay in `ENTER` down by the same amount; a constant
 * offset is safe there in a way that rescaling is not, because it preserves
 * every gap between stickers and so preserves what `ORDER` guarantees.
 *
 * The whole thing runs to about 2924ms, which is a long time and is allowed to
 * be. The text is readable and clickable from the first frame it moves and the
 * sticker layer is `pointer-events-none`, so nothing decorative is ever between
 * the visitor and the thing they came to press. That, not the total, is what
 * lets the cascade take its time.
 *
 * There are no `animation-delay` utilities left on this page — the three
 * elements share one arrival. If you ever reintroduce a stagger here, write it
 * as an arbitrary property — `animation-delay` and a value inside square
 * brackets — rather than Tailwind's `delay-*`: in v4 those set
 * `transition-delay`, and this is an animation.
 * They'd compile, apply to nothing, and the elements would arrive together with
 * no error anywhere to explain why — which now looks exactly like the intended
 * design, so the bug would be invisible.
 *
 * `prefers-reduced-motion` is handled a file away — the block at the bottom of
 * `globals.css` flattens `--dur-hero` and `--dur-fall` and zeroes every
 * `animation-delay` in the document, so everything lands at once. Nothing here
 * has to know that.
 */
export default function LoginPage() {
  return (
    // `isolate` is load-bearing, not decoration. The sticker layer is
    // positioned and the heading and paragraph are not, and positioned
    // descendants paint *above* in-flow content regardless of DOM order — so
    // without a stacking context the stickers would sit on top of the words.
    // `isolate` here plus `-z-10` there is the fix; `-z-10` alone would send
    // the layer looking for the nearest stacking context, find the root, and
    // disappear behind the page background.
    <main className="relative isolate mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-8 py-24 text-center">
      {/* A sibling of the text, not a wrapper around it. The layer is `fixed`
          and positions everything in viewport percentages, so it knows nothing
          about the words above it and nothing here can move it. */}
      <FloatingStickers />

      {/* `text-balance` matters more at this size than it did at the old one:
            "Baby Steps" fits one line on a phone, and the paragraph under it
            is the thing that would otherwise break into a two-word orphan. */}
      <h1 className="animate-rise mb-5 font-heading text-6xl font-semibold tracking-tight text-balance sm:text-7xl">
        Baby Steps
      </h1>

      <p className="animate-rise mb-10 text-xl leading-relaxed text-balance text-ink-muted sm:text-2xl">
        Build habits slowly over time, watch and track your progress, and keep
        life balanced through the things that matter.
      </p>

      {/* A wrapper rather than the animation on `SignInButtons` itself. That
            component knows about OAuth and pending states; where it sits in an
            entrance sequence is this page's business, and the next page to use
            it shouldn't inherit a delay from this one. */}
      {/* The column widened to `max-w-md` when the tagline got bigger — three
            clauses at `text-2xl` in 24rem is seven lines of text. The buttons
            keep the old width, because a button that wide starts to read as a
            banner rather than as something to press. */}
      {/* No delay, and that is the change: the buttons used to come in 150ms
            behind the heading, which put them fully on screen at 570ms. They
            now rise with everything else and are there at 420ms. The number
            that matters on this page is not when the animation finishes but
            when the thing you came to press is actually there — and it is only
            ever earlier than it was. */}
      <div className="animate-rise w-full max-w-sm">
        <SignInButtons />
      </div>
    </main>
  );
}
