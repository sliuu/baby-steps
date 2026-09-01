import { ChartCard } from "./ChartCard";
import type { Tally } from "@/lib/analytics";
import { normalize, round2 } from "@/lib/charts";
import { ramp } from "@/lib/palette";

type Props = { tally: Tally };

/**
 * The same range as a ranking, and the only chart here that isn't SVG.
 *
 * A bar is a rectangle of a given width, and that is a thing HTML has always
 * been able to draw. Reaching for `<svg>` would mean giving up text that wraps,
 * a font that inherits, and a layout that reflows at any card width — all to
 * draw six boxes. SVG earns its keep on the star and the donut because those
 * are shapes with angles in them; here it would be a coordinate system nobody
 * needs.
 *
 * Sorted biggest-first, which is the one place the three charts genuinely
 * disagree about order. The star and the donut both draw `tally.areas` in the
 * library's order because their shape and their colour positions have to stay
 * comparable between ranges. A bar chart has no such shape — nothing about it
 * is spoiled by rows moving — and unsorted bars are just a table with worse
 * numbers. Same seam `AreaTable` was written around in Step 12: sorting is a
 * question the view asks, so it happens in the view.
 *
 * Lengths come from `normalize` — share of the *busiest* area, not of the total
 * — so the top bar always runs the full width and every other one is read
 * against it. The donut is the part-to-whole chart; this one is about balance.
 */
export function Bars(props: Props) {
  const { areas } = props.tally;

  if (areas.length === 0) return null;

  // A copy. `tally.areas` is memoized upstream and shared with the other two
  // charts and the table; sorting in place would reorder their spokes and
  // segments from under them.
  const ranked = [...areas].sort((a, b) => b.count - a.count);
  const shares = normalize(ranked.map((area) => area.count));

  return (
    <ChartCard>
      {/* `h-full` plus `justify-between` is what makes six rows fill a box
          sized for a circle: the first row sits at the top, the last at the
          bottom, and the slack is shared out between them. `gap-4` stays as the
          floor, so a range with two areas spreads instead of stretching two
          rows to the corners. */}
      <ul className="flex h-full flex-col justify-between gap-4">
        {ranked.map((area, i) => (
          <li
            key={area.areaId}
            // Three columns: a name that may be long, a track that takes what's
            // left, and a count that takes exactly what it needs. `minmax(0,…)`
            // on the name is the part that isn't obvious — a grid column's
            // default minimum is its content, so without it a long area name
            // refuses to shrink and pushes the track off the card instead of
            // truncating.
            className="grid grid-cols-[minmax(0,8.5rem)_1fr_2.5rem] items-center gap-4"
          >
            {/* EB Garamond, matching the area names elsewhere. `truncate` is
                the honest failure for a name too long for its column: an
                ellipsis says there's more, where wrapping would make one row
                twice the height of its neighbours and break the comb of bars
                this chart is read as. */}
            <span className="truncate font-heading text-[1.05rem]">
              {area.areaName}
            </span>

            {/* The track: full width, fully rounded, and always drawn. An area
                at zero shows an empty track rather than nothing, because "this
                area exists and you did none of it" is a different statement
                from "this area isn't here". */}
            <span className="block h-2.5 w-full rounded-full bg-secondary">
              <span
                className={`block h-full rounded-full ${ramp(area.colorKey).soft} ${
                  // A nonzero bar never shrinks below its own height. At
                  // width 2% of a 300px track the fill is 6px wide and 10px
                  // tall, and `rounded-full` turns that into a lopsided blob
                  // rather than the pill every other row is wearing. Below the
                  // floor the length stops being readable anyway; what's left
                  // to communicate is "some, but barely", and a dot does that.
                  area.count === 0 ? "" : "min-w-2.5"
                }`}
                // The one inline style in the file, and it has to be: this
                // number comes from the data, and Tailwind cannot generate a
                // class for a width it has never seen. Same scanner limitation
                // as `bg-ramp-${colorKey}` in `palette.ts` — the tool reads the
                // source text, it doesn't run it.
                style={{ width: `${round2(shares[i] * 100)}%` }}
              />
            </span>

            {/* Right-aligned tabular figures, so the ones place stays in one
                vertical line as the counts change. A dash for zero, matching
                the table: zero is a measurement, a dash is nothing here, and
                the eye skips it instead of reading it. */}
            <span className="tabular text-right">
              {area.count === 0 ? (
                <span className="text-ink-muted">—</span>
              ) : (
                area.count
              )}
            </span>
          </li>
        ))}
      </ul>
    </ChartCard>
  );
}
