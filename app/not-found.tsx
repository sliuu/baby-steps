import Link from "next/link";

import { MoodMark } from "@/components/calendar/MoodMark";
import { StickerMark } from "@/components/calendar/StickerMark";
import { Button } from "@/components/ui/button";
import type { Mood } from "@/lib/moods";
import type { StickerFace } from "@/lib/stickers";

/**
 * What the two days either side of the missing one have on them.
 *
 * They are here to be ordinary. The joke in the middle only reads as a gap if
 * the days around it look like days — a mood, a couple of marks, two different
 * hues — so these are the app's own seed activities rather than anything
 * invented for this page. Nothing fetches them: a 404 is not a page that should
 * be waiting on the database to draw its own illustration.
 */
const MONDAY: StickerFace[] = [
  { name: "Gym", mark: "icon:dumbbell", colorKey: "blue" },
  { name: "Meditation", mark: "icon:sparkles", colorKey: "red" },
];

const WEDNESDAY: StickerFace[] = [
  { name: "Piano", mark: "icon:piano", colorKey: "yellow" },
  { name: "Date night", mark: "icon:heart", colorKey: "green" },
];

/**
 * What a wrong address looks like, instead of Next's built-in 404.
 *
 * Until this file existed there was nothing here, so an unmatched URL fell
 * through to the framework default: "404 | This page could not be found" in the
 * browser's own sans, centred on white, at around 14px. It inherits none of the
 * app — not the cream, not the serif, not the theme — and on a dark-themed
 * window it arrives as a white slab. The root `app/not-found` catches every
 * unmatched URL for the whole app, so this is the page a mistyped link lands
 * on, and it was the one screen with no design on it at all.
 *
 * A Server Component, and it takes no props. `not-found.tsx` never receives
 * any — there is no error object and nothing to reset, which is the difference
 * between this and `error.tsx` next door. That one is a failure and offers a
 * retry; this one is an address, and the only useful move is to go back to the
 * calendar. So it links rather than resets.
 *
 * The layout is the signed-out page's, deliberately: a centred column at
 * `max-w-lg`, `animate-rise` on the block, and the same two-beat idea of a
 * heading you can read from the first frame. What it does *not* borrow is
 * `FloatingStickers` — that layer's bands are arithmetic against the login
 * page's specific column and tagline (see the comments in it), and a different
 * sentence here would push the words into the stickers at some window sizes.
 */
export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-8 py-24 text-center">
      {/* The joke, and the only picture on the page: three days of the
          calendar, and the one in the middle doesn't exist.

          A single cell was the first attempt and it didn't read — an empty
          bordered box on its own looks unfinished rather than empty. Emptiness
          is relative, so it needs neighbours: Monday and Wednesday are ordinary
          days with marks and moods on them, and the gap between them is the
          whole illustration. It also brings the app's hues onto a page that was
          otherwise entirely ink on cream.

          Built from the real anatomy rather than drawn to look like it — the
          `rounded-md` shell over `bg-hairline` that `MonthGrid` uses to fake its
          1px rules, the same `daylabel` strip, the same `p-2.5` cells, and
          `StickerMark` and `MoodMark` themselves. If the calendar's proportions
          change, this moves with them.

          `aria-hidden`, because it is a visual pun and not information: the
          heading below says the same thing in words, and the marks inside carry
          `sr-only` names — "Gym", "Mood: Rough" — that would otherwise be read
          out as though this page had a calendar on it. */}
      <div
        aria-hidden="true"
        className="animate-rise mb-9 overflow-hidden rounded-md border border-hairline bg-hairline"
      >
        <div className="grid grid-cols-3 gap-px">
          <div className="daylabel bg-surface py-2 text-center">Mon</div>
          <div className="daylabel bg-surface py-2 text-center">Tue</div>
          <div className="daylabel bg-surface py-2 text-center">Wed</div>

          <DayFace numeral="12" mood="good" stickers={MONDAY} />

          {/* The missing day. The numeral wears today's ring — an outline, not
              a fill, for the reason `DayCell` gives: a filled circle needs its
              text to invert, and inverted text is one token away from
              unreadable. It is a pill rather than `size-7` because three digits
              do not fit a 28px circle; the oldstyle figures are the calendar's
              own. Nothing below the header line, which is the point. */}
          <DayFace numeral="404" mood="rough" stickers={[]} missing />

          <DayFace numeral="14" mood="great" stickers={WEDNESDAY} />
        </div>
      </div>

      <p className="eyebrow animate-rise mb-3">Page not found</p>

      {/* The size the complaint was about. `text-page-title` is 3rem and the
          `sm:` rung is 3.75rem — a rung under the signed-out page, which is the
          only screen allowed to be louder than this one. `text-balance` because
          the line breaks into a two-word orphan on a phone otherwise. */}
      <h1 className="animate-rise mb-5 font-heading text-page-title text-balance sm:text-display">
        There&rsquo;s no such day
      </h1>

      {/* `text-lg` rather than the body default, for the same reason as the
          heading: this is the whole content of the page, not a caption under
          something else. */}
      <p className="animate-rise mb-10 text-lg leading-relaxed text-balance text-ink-muted">
        This link points at a day that was never in your calendar. Everything
        you&rsquo;ve actually filled in is exactly where you left it.
      </p>

      {/* `asChild`, so the button's styling lands on a real `<a>`. A 404 is a
          navigation, and a `<button>` with an `onClick` router push would lose
          middle-click, open-in-new-tab and the status-bar preview for no gain. */}
      <Button asChild size="lg" className="animate-rise">
        <Link href="/">Back to the calendar</Link>
      </Button>
    </main>
  );
}

/**
 * One cell of the illustration. Not `DayCell` itself, and the reason is that
 * `DayCell` is a drop target: it takes a `DayCellData`, a highlight, a caret
 * index and four callbacks, and it calls `useDroppable`, which would make this
 * page a Client Component and pull dnd-kit into the bundle for a picture. What
 * it shares with the real thing is the part that's visible — the `p-2.5` box,
 * the `size-7` numeral, the header line with the mood pushed to the right, and
 * the 30px line box the marks sit on.
 *
 * `w-28` is 112px, about what a cell measures in a 1152px month. It drops to
 * `w-24` under `sm`, and that is a real fix rather than tidiness: three 112px
 * cells plus the page's `px-8` come to 402px, which is wider than a 390px
 * phone. The row does not wrap, so the overflow widened the whole centred
 * column and pushed the heading off the right-hand edge — the illustration
 * broke the page it was decorating. 96px cells leave 36px of slack.
 */
function DayFace(props: {
  numeral: string;
  mood: Mood;
  stickers: StickerFace[];
  /** The day that isn't: ringed numeral, wider for three digits, no marks. */
  missing?: boolean;
}) {
  return (
    <div className="flex min-h-24 w-24 flex-col bg-background p-2.5 sm:w-28">
      <div className="flex items-center justify-between gap-2">
        <span
          className={
            props.missing
              ? "oldstyle grid h-7 place-items-center rounded-full px-2 text-[0.875rem] font-medium text-ink ring-1 ring-ink"
              : "oldstyle grid size-7 place-items-center rounded-full text-[0.875rem] text-ink"
          }
        >
          {props.numeral}
        </span>
        <MoodMark mood={props.mood} />
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {props.stickers.map((sticker) => (
          <StickerMark key={sticker.name} sticker={sticker} />
        ))}
      </div>
    </div>
  );
}
