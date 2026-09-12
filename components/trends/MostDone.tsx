import type { ActivityRanking } from "@/lib/analytics";
import { normalize, round2 } from "@/lib/charts";
import { ramp } from "@/lib/palette";

type Props = {
  ranking: ActivityRanking;
  /** The range as an adverbial — "this month". From `rangePhrase`. */
  phrase: string;
};

/**
 * How many rows before the list stops being a ranking and starts being a table.
 *
 * Eight is about where the eye stops comparing bar lengths and starts reading
 * numbers, and it's also about where a twenty-habit tray would turn this panel
 * into the page's tallest element for no gain. What's cut off is named in the
 * footer rather than hidden, because "and eleven others" is itself an answer.
 */
const SHOWN = 8;

/**
 * Which habits you did most, ranked, for whatever range is picked.
 *
 * This is the bar chart Step 14 drew, pointed at a different unit. It used to
 * rank the six life areas, which the Life Star beside it already draws and the
 * table beneath it already lists — three pictures of one number. Ranking the
 * *habits* is the thing none of them could say: an area at thirty marks doesn't
 * tell you whether that was thirty runs or ten runs, ten swims and ten walks.
 *
 * Not in a `ChartCard`. That card is a fixed 520:320 box because two SVGs share
 * a viewBox and the third chart had to stop resizing the column when you
 * switched to it. There is no switching any more — the star and this are both
 * on the page at once — so the constraint is gone, and a list that is as tall
 * as its rows beats one padded or squeezed to a ratio it doesn't have. It keeps
 * the card's chrome so the two panels still read as a pair.
 *
 * Nothing here is `aria-hidden`, which is the other thing the card used to own.
 * The star hides because a radar polygon has no reading without the table; this
 * is a list of names and numbers that happens to have bars behind it, so the
 * content is already in the accessibility tree and only the track is
 * decoration.
 *
 * Lengths come from `normalize` — share of the *busiest* habit, so the top bar
 * always runs full width. This is a ranking, not a part-to-whole: what you want
 * off it is "twice as much as the next one", and share-of-total would squash
 * every bar into the left third as soon as you have more than a few habits.
 */
export function MostDone(props: Props) {
  const { activities, total } = props.ranking;

  if (activities.length === 0) return null;

  const shown = activities.slice(0, SHOWN);
  const hidden = activities.length - shown.length;
  const shares = normalize(shown.map((activity) => activity.count));

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-hairline bg-surface p-6">
      <h2 className="eyebrow">Most done {props.phrase}</h2>

      {/* One grid for the whole list, with each row opting into its columns
          through `grid-cols-subgrid` — the technique Step 14 landed on so the
          name column is `max-content` (as wide as the longest name that is
          actually there) instead of a guessed width that clips one of them.
          `min-w-0` on the name is what lets that column give up and truncate
          rather than pushing the panel wider than its half of the page. */}
      <ul className="grid grid-cols-[minmax(0,max-content)_1fr_2.5rem] gap-x-4 gap-y-3">
        {shown.map((activity, i) => (
          <li
            key={activity.activityId}
            className="col-span-3 grid grid-cols-subgrid items-center"
          >
            <span className="min-w-0 truncate font-heading text-[1.05rem]">
              {activity.name}
            </span>

            <span
              className="block h-2.5 w-full rounded-full bg-secondary"
              // The bar says the same thing the number beside it says, one
              // inch to the right. A screen reader reading both would hear
              // every row twice.
              aria-hidden="true"
            >
              <span
                className={`block h-full min-w-2.5 rounded-full ${ramp(activity.colorKey).soft}`}
                // Data-driven, so it cannot be a class: Tailwind reads the
                // source text, it never runs it. Same reason as `palette.ts`.
                style={{ width: `${round2(shares[i] * 100)}%` }}
              />
            </span>

            <span className="tabular text-right">{activity.count}</span>
          </li>
        ))}
      </ul>

      {hidden > 0 && (
        <p className="text-[0.83rem] text-ink-muted">
          {hidden} more habit{hidden === 1 ? "" : "s"}, {tailTotal(props.ranking)}{" "}
          mark
          {tailTotal(props.ranking) === 1 ? "" : "s"} between them.
        </p>
      )}

      <p className="sr-only">
        {total} mark{total === 1 ? "" : "s"} across {activities.length} habit
        {activities.length === 1 ? "" : "s"} {props.phrase}.
      </p>
    </section>
  );
}

/** Marks belonging to the habits the list didn't have room for. */
function tailTotal(ranking: ActivityRanking): number {
  return ranking.activities
    .slice(SHOWN)
    .reduce((sum, activity) => sum + activity.count, 0);
}
