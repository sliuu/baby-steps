import type { Tally } from "@/lib/analytics";
import { ramp } from "@/lib/palette";

type Props = {
  tally: Tally;
  /**
   * Names the period the numbers cover. Visually hidden — the range is stated
   * beside the dropdown, where you're already looking when you set it, so
   * printing it again above the table was saying the same thing twice.
   *
   * It stays in the markup because "hidden" and "gone" aren't the same thing
   * here. A `<caption>` is the table's accessible name: with one, a screen
   * reader announces "Marks by life area, 1 Aug 2026 to 22 Aug 2026" on entering
   * it; without one, a column of numbers arrives with no period attached and the
   * text that would have supplied it is somewhere else in the document. Sighted
   * readers get that context from proximity. This is the same context, delivered
   * the other way.
   */
  caption: string;
};

/**
 * The counts, as a real table.
 *
 * A real `<table>` with real `<th>`s rather than a grid of divs, and this is the
 * step where that starts mattering. Rows of numbers are the one thing a screen
 * reader genuinely cannot reconstruct from layout: given a table it can say
 * "Spirituality, Marks 14, Share 31%" while moving down a column, and given
 * divs it reads twenty-four unlabelled numbers in a row. The `<caption>` is what
 * says *which* twenty-four — without it "14" is a number with no period attached
 * to it.
 *
 * `scope` on each header is the part people skip. It's what tells the reader
 * that "Marks" heads a column rather than a row, and it's one attribute.
 */
export function AreaTable(props: Props) {
  const { tally } = props;

  /**
   * Biggest first — a ranking, which is the question this table answers.
   *
   * Sorted *here* rather than in `tally`, and that seam matters from the next
   * step on. `tally.areas` stays in the library's own order because the Life
   * Star draws one spoke per area and the spokes have to sit still: a polygon
   * whose vertices reorder by count changes shape for a reason that isn't about
   * the data, and comparing two ranges becomes impossible. The table wants a
   * ranking, the chart wants a fixed frame, and both read the same tally.
   *
   * A copy, not a sort in place — `tally.areas` is memoized upstream and shared
   * with everything else on the page. Sorting it here would mutate an object
   * other components are holding.
   *
   * `sort` is stable, so areas with equal counts keep the library's order rather
   * than swapping around between renders.
   */
  const ranked = [...tally.areas].sort((a, b) => b.count - a.count);

  /**
   * What the Share column actually adds up to, printed as-is.
   *
   * Each row is rounded on its own so that equal counts always show equal
   * shares (see `percent`), which means the column lands on 100.1 about as often
   * as it lands on 100. The footer sums the rounded values rather than asserting
   * a flat "100%", because those are two different claims: one says "these are
   * all of your marks", which is true either way, and the other says "these
   * numbers add up", which has to survive being checked with a finger. Printing
   * 100% over a column that reads 100.1 is the discrepancy you'd find.
   *
   * Re-rounded after the sum: adding a handful of one-decimal floats together
   * lands on 100.10000000000001, and `toFixed` alone would hide that rather than
   * fix it.
   */
  const columnTotal =
    Math.round(ranked.reduce((sum, area) => sum + area.percent, 0) * 10) / 10;

  return (
    <table className="w-full border-collapse text-left">
      <caption className="sr-only">{props.caption}</caption>

      <thead>
        <tr className="border-b border-hairline">
          <th scope="col" className="eyebrow py-2 font-normal">
            Area
          </th>
          {/* Numbers right-align so their digits line up in a column. A count
              and a percentage read as a quantity you can compare down the page
              only if the ones place is always in the same spot. */}
          <th scope="col" className="eyebrow py-2 text-right font-normal">
            Marks
          </th>
          <th scope="col" className="eyebrow py-2 text-right font-normal">
            Share
          </th>
        </tr>
      </thead>

      {/* Rows are `py-2`, the same as the header, and they used to be a notch
          looser. Eight rows is where a small number gets big: dropping 2px a
          row takes about thirty off the column, which is most of what this side
          had to lose to finish level with the chart beside it. It's also the
          cheapest place to take it — a table is a grid of short strings, and
          the thing that separates its rows is the rule between them rather than
          the air around them. */}
      <tbody>
        {ranked.map((area) => (
          <tr key={area.areaId} className="border-b border-hairline">
            {/* The area name heads its own row, which is what lets a screen
                reader say the name again beside each number in it. */}
            <th scope="row" className="py-2 font-normal">
              <span className="flex items-center gap-2.5">
                {/* Bare. This dot briefly wore a hairline ring, because at
                    28% a 10px tint on cream was 1.19:1 and genuinely
                    invisible. Deepening the ramp to 48% fixed the cause
                    instead, and once the colour carries itself the ring is a
                    second outline competing with the row's own rule. */}
                <span
                  aria-hidden="true"
                  className={`size-2.5 shrink-0 rounded-full ${ramp(area.colorKey).soft}`}
                />
                {area.areaName}
              </span>
            </th>

            {/* `tabular` so the digits stop jittering as the range changes.
                Proportional figures re-space the whole column when a 1 becomes
                a 7, which reads as the table twitching. */}
            <td className="tabular py-2 text-right">
              {/* An area with nothing in it gets a dash, not a 0. Zero is a
                  measurement; a dash is "nothing here", and at a glance the
                  eye skips it instead of counting it. */}
              {area.count === 0 ? (
                <span className="text-ink-muted">—</span>
              ) : (
                area.count
              )}
            </td>

            <td className="tabular py-2 text-right">
              {area.count === 0 ? (
                <span className="text-ink-muted">—</span>
              ) : (
                // Always one decimal, including on a whole number: `20.0%`
                // rather than `20%`. It costs a character and it keeps every
                // decimal point in the same vertical line, which is the entire
                // reason this column is `tabular` in the first place.
                `${area.percent.toFixed(1)}%`
              )}
            </td>
          </tr>
        ))}
      </tbody>

      <tfoot>
        <tr>
          <th scope="row" className="py-2 font-normal text-ink-muted">
            Total
          </th>
          <td className="tabular py-2 text-right text-ink-muted">
            {tally.total}
          </td>
          <td className="tabular py-2 text-right text-ink-muted">
            {tally.total === 0 ? "—" : `${columnTotal.toFixed(1)}%`}
          </td>
        </tr>
      </tfoot>
    </table>
  );
}
