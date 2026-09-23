import { MoodMark } from "@/components/calendar/MoodMark";
import type { MoodTally } from "@/lib/analytics";
import { MOOD_COLOR } from "@/lib/moods";

/**
 * How the days felt, as five bars: the left half of Moods on a wide screen and
 * the top of it on a phone. It replaced a wrapping strip of "face, word, count"
 * that gave the numbers and no sense of their proportion.
 *
 * **A five-step colour scale.** Calendar mood faces stay neutral so they do not
 * compete with life-area stickers. This chart has a different job: it needs to
 * make the ordered scale legible at a glance, so great → rough moves from the
 * sticker palette's yellow through green to blue. Every bar is a flat pastel
 * fill — the exact tint layer used by stickers, not a chart-only gradient.
 *
 * All five always, in the scale's order — never ranked, never filtered. See
 * `MoodTally.moods`: these are a scale running great → rough, so their order is
 * information, and a zero is the useful measurement "no rough days". The bars
 * are sized against the largest count, like `AreaBars`, so the commonest mood
 * always runs the full width.
 *
 * No word beside the face. The mouth is the mood's name in this app — the
 * calendar prints nothing else — and a screen reader hears the word from
 * `MoodMark`'s own label, followed by the count.
 */
export function MoodBars(props: { moods: MoodTally }) {
  const { moods, total } = props.moods;

  if (total === 0) {
    // Not five empty tracks. A column of bars with nothing in them looks like a
    // chart that failed to load; a sentence says the same thing and points at
    // the calendar, matching how the page's other empty state behaves.
    return (
      <p className="text-[0.875rem] text-ink-muted">
        No moods logged yet. Tap a day on the Calendar tab to set one.
      </p>
    );
  }

  const most = Math.max(...moods.map((entry) => entry.count));

  return (
    <ul className="flex flex-col gap-[11px]">
      {moods.map((entry) => (
        <li key={entry.mood} className="flex items-center gap-2.5">
          {/* Audible here, unlike in the strip this replaced: the word is no
              longer printed beside the face, so the face's own "Mood: Great"
              is the row's name. 22px, up from the calendar's 20. */}
          <span className="flex [&_svg]:size-[22px] [&_svg]:text-ink">
            <MoodMark mood={entry.mood} />
          </span>

          <span
            aria-hidden="true"
            className="h-[9px] flex-1 overflow-hidden rounded-full bg-secondary"
          >
            <span
              style={{
                width: `${(entry.count / most) * 100}%`,
                backgroundColor: MOOD_COLOR[entry.mood],
              }}
              className="block h-full rounded-full transition-[width] duration-200 ease-out motion-reduce:transition-none"
            />
          </span>

          {/* Same dash-for-zero rule as `AreaBars` a tab away, for the same
              reason: zero is a measurement, a dash is nothing here, and the eye
              skips it instead of reading it. */}
          <span className="tabular w-[22px] text-right text-[0.75rem] text-ink-label">
            {entry.count === 0 ? (
              <>
                —<span className="sr-only"> no days</span>
              </>
            ) : (
              <>
                {entry.count}
                <span className="sr-only">
                  {entry.count === 1 ? " day" : " days"}
                </span>
              </>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
