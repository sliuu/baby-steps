import type { Tally } from "@/lib/analytics";

import { CategoryBars } from "./CategoryBars";

type Props = {
  tally: Tally;
  /** The sentence, already composed. Null when there's nothing to say. */
  takeaway: string | null;
  /** `CategoryBars`' accessible name. See the prop's note there. */
  caption: string;
};

/** Categories in words and bars: the phone tab, or beside the star on wide. */
export function Readout(props: Props) {
  return (
    <div className="flex flex-col">
      {props.takeaway && <Sentence text={props.takeaway} />}

      <CategoryBars tally={props.tally} caption={props.caption} />
    </div>
  );
}

/** sr-only: the star is aria-hidden, so this line is the chart for readers. */
function Sentence(props: { text: string }) {
  return <p className="sr-only">{props.text}</p>;
}
