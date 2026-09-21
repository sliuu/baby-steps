import type { Tally } from "@/lib/analytics";

import { AreaBars } from "./AreaBars";

type Props = {
  tally: Tally;
  /** The sentence, already composed. Null when there's nothing to say. */
  takeaway: string | null;
  /** `AreaBars`' accessible name. See the prop's note there. */
  caption: string;
};

/**
 * Areas in words and numbers: the whole tab on a phone, and the right-hand
 * column beside the star on a wide screen.
 *
 * It composes rather than computes. Every number arrives as a prop, including
 * the sentence: `takeaway` is a pure function in `lib/analytics.ts` because the
 * branching in it (one leader, a tie, a flat range) is exactly the kind of thing
 * that's tedious to check by rendering and trivial to check with `assert`.
 *
 * It was a table of counts and one-decimal shares under a header row. It is the
 * bar list now — see `AreaBars` — which is the same six numbers with a picture
 * of their proportions beside each, and on a wide screen it sits opposite a
 * star drawing the same proportions as a shape.
 */
export function Readout(props: Props) {
  return (
    <div className="flex flex-col">
      {props.takeaway && <Sentence text={props.takeaway} />}

      <AreaBars tally={props.tally} caption={props.caption} />
    </div>
  );
}

/**
 * The chart, stated — to a screen reader only.
 *
 * It used to be printed, big, above the table: "Work held the greatest share
 * of your attention this month." It came off the screen because the star and
 * the bars already show it, and a sentence restating a picture you are
 * looking at reads as the app talking over you.
 *
 * It stays in the page as `sr-only` because the star beside it is
 * `aria-hidden`, so for a screen reader this line *is* the chart, arriving
 * before the list rather than instead of it. `sr-only` is absolutely
 * positioned, so it takes no room and adds no gap.
 */
function Sentence(props: { text: string }) {
  return <p className="sr-only">{props.text}</p>;
}
