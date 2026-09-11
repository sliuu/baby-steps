import { MoodMark } from "@/components/calendar/MoodMark";
import type { MoodTally, Tally } from "@/lib/analytics";

import { AreaTable } from "./AreaTable";

type Props = {
  tally: Tally;
  moods: MoodTally;
  /** The sentence, already composed. Null when there's nothing to say. */
  takeaway: string | null;
  /** `AreaTable`'s accessible name. See the prop's note there. */
  caption: string;
  /** "this month", "so far" — from `rangePhrase`, for the mood heading. */
  phrase: string;
};

/**
 * The right-hand column: the same range in words and numbers.
 *
 * No card. That's the whole visual argument of this step and it's worth stating
 * plainly, because "put it in a card too" is the obvious thing to do and it
 * would be wrong. A card is a frame, and a frame says "this is a picture, look
 * at it as a unit". The chart on the left is exactly that. This side is reading
 * matter — a sentence, then a table, then a strip — and sitting it on the page
 * ground lets it behave like the rest of the app's text does. Two cards side by
 * side would also make the page a pair of panels with no hierarchy, when the
 * actual relationship is that one of them is the picture and the other is what
 * the picture says.
 *
 * It composes rather than computes. Every number arrives as a prop, including
 * the sentence: `takeaway` is a pure function in `lib/analytics.ts` because the
 * branching in it (one leader, a tie, a flat range) is exactly the kind of thing
 * that's tedious to check by rendering and trivial to check with `assert`. What
 * is left here is which element goes where — which genuinely does have to be
 * looked at.
 */
export function Readout(props: Props) {
  return (
    // `gap-6`, tightened from 8, and the reason is the column beside it. The
    // chart card is a fixed ratio, so its height is set by how wide the column
    // is — it can't be stretched to meet this one, and this one is the taller of
    // the two by about the height of two gaps. Closing the two gaps and shaving
    // the table's row padding is what brings the bottoms to roughly the same
    // line. Roughly is the honest word: six areas with marks and five moods on
    // one row is the common case, and a range with fewer of either ends higher.
    <div className="flex flex-col gap-6">
      {props.takeaway && <Sentence text={props.takeaway} />}

      <AreaTable tally={props.tally} caption={props.caption} />

      <MoodStrip moods={props.moods} phrase={props.phrase} />
    </div>
  );
}

/**
 * The chart, stated.
 *
 * A chart shows a shape and leaves you to read it. This says the reading out
 * loud, which is a real accessibility feature and not only a nicety: the three
 * charts are `aria-hidden`, so for a screen reader this line *is* the summary,
 * arriving before the table rather than instead of it.
 *
 * One line. A muted second line under it used to give the totals — "4 marks in
 * all, across 2 of your 6 areas" — and it sat directly above a table of the
 * same numbers, laid out so you can read any of them without doing arithmetic
 * from memory. Two versions of one fact, and the sentence kept the version that
 * says something the table can't.
 */
function Sentence(props: { text: string }) {
  return (
    // `max-w-prose` even though the column is already narrow. The column's width
    // is set by the grid and can change; a line length is a fact about reading.
    <p className="max-w-prose font-heading text-[1.35rem] leading-snug">
      {props.text}
    </p>
  );
}

/**
 * How the days felt, as a row of five.
 *
 * The plan for this step asked for "a dot + name + count", and the dot here is
 * the mood's own face instead. Not a liberty — a colour dot is the one thing
 * this app has consistently refused to give a mood. `MoodMark` says it ("no
 * colour at all… never compete with the six area hues"), `wash()` in
 * `palette.ts` says it, and `highlight.ts` says it. Six hues mean six life
 * areas, everywhere, and spending one on "good" would break that on the single
 * page where both appear at once. The face is the mood's mark, so the face is
 * what goes here.
 *
 * Exported as well as used here, for the one case the layout splits them up:
 * a range can hold moods and no marks — somebody who logs how a day felt
 * without placing a sticker on it — and then the chart and the table have
 * nothing to draw while this still does. `TrendsBoard` shows it beside the
 * empty state there.
 *
 * All five always, in the scale's order — never ranked, never filtered. See
 * `MoodTally.moods`: these are a scale running great → rough, so their order is
 * information, and a zero is the useful measurement "no rough days".
 */
export function MoodStrip(props: { moods: MoodTally; phrase: string }) {
  const { moods, total } = props.moods;

  return (
    <section className="flex flex-col gap-3">
      {/* Plural, because it counts five of them. "Mood this month" read as a
          label for a single value — the month's mood — which is exactly what
          this isn't: it's the distribution, and the zero rows are part of the
          answer. `phrase` is shared with the takeaway sentence so the two can't
          drift into describing the same fortnight two different ways. */}
      <h2 className="font-heading text-[1.35rem]">Moods {props.phrase}</h2>

      {total === 0 ? (
        // Not five dashes. A row of empty counts looks like a broken strip; a
        // sentence says the same thing and points at the calendar, matching how
        // the page's other empty state behaves.
        <p className="text-[0.875rem] text-ink-muted">
          No moods logged yet. Tap a day on the Calendar tab to set one.
        </p>
      ) : (
        // Wraps rather than scrolls or shrinks. Five items of "face + word +
        // number" don't fit one narrow column, and two tidy rows of a wrapped
        // strip read better than five squeezed columns. `gap-y` is smaller than
        // `gap-x` on purpose: the wrap should look like one strip that turned a
        // corner, not like two lists.
        //
        // `gap-x-5` rather than 6, and this is the one gap here that buys
        // vertical space by getting narrower. Five items either fit on one line
        // or they don't; 4px off each of four gaps is 16px of width, which is
        // roughly the margin the strip was missing at this column width. When
        // it fits, the whole strip is one row shorter.
        <ul className="flex flex-wrap gap-x-5 gap-y-3">
          {moods.map((entry) => (
            <li key={entry.mood} className="flex items-center gap-2">
              {/* Hidden from the reader, and only here. `MoodMark` carries its
                  own "Mood: Great" for the calendar, where the face is alone
                  and has to name itself. In this strip the word is printed
                  right beside it, so leaving it audible would say "Great"
                  twice. */}
              <span aria-hidden="true" className="flex">
                <MoodMark mood={entry.mood} />
              </span>

              <span className="text-[0.875rem]">{entry.label}</span>

              {/* Same dash-for-zero rule as the table above it, for the same
                  reason: zero is a measurement, a dash is nothing here, and
                  the eye skips it instead of reading it. */}
              <span className="tabular text-[0.875rem]">
                {entry.count === 0 ? (
                  <span className="text-ink-muted">—</span>
                ) : (
                  entry.count
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
