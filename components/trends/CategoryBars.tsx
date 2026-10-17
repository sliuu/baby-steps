import type { Tally } from "@/lib/analytics";
import { categoryColor } from "@/lib/palette";

type Props = {
  tally: Tally;
  /**
   * The list's accessible name. Never drawn: the range is printed beside the
   * dropdown, where you're already looking when you set it. A screen reader
   * entering the list has left that behind, so this says it again. See
   * `captionFor`.
   */
  caption: string;
};

/**
 * The six categories as bars, biggest first. It replaced a three-column table
 * of counts and percentages, and it is the whole of Categories on a phone and the
 * right-hand half beside the star on a wide screen.
 *
 * **Two different numbers, on purpose.** The bar is the category's count over the
 * *largest* category's, so the leader always runs the full width and the others
 * read against it. The percentage is the category's share of *all* marks. The bar
 * compares categories with each other; the number says what the range was made of.
 * Sizing the bars by share would make every bar short whenever the marks are
 * spread out, which is the case a balance picture most needs to show clearly.
 *
 * A list rather than a table, and the text still carries every number. The
 * bars are `aria-hidden` because each row's name, count and share are printed
 * next to its bar. A screen reader gets "Work, 17 marks, 33%" and the picture
 * adds nothing it could read.
 */
export function CategoryBars(props: Props) {
  const { tally } = props;

  /**
   * Biggest first, empty categories last. A copy, because `tally.categories` stays in
   * library order for the star, whose spokes must not move. `sort` is stable,
   * so equal counts keep the library's order between renders.
   */
  const ranked = [...tally.categories].sort((a, b) => b.count - a.count);
  const most = ranked[0]?.count ?? 0;

  return (
    <section aria-label={props.caption} className="flex flex-col gap-[18px]">
      <ul className="flex flex-col gap-3.5">
        {ranked.map((category) => {
          const tone = categoryColor(category.colorKey);
          const width = most === 0 ? 0 : (category.count / most) * 100;

          return (
            <li key={category.categoryId} className="flex flex-col gap-1.5">
              <span className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={`size-[9px] shrink-0 rounded-full ${tone.soft}`}
                />
                {/* Shrinks and wraps. "Romance & Adventure" on a 320px screen
                    is the long case, and a truncated category name is worse than a
                    two-line row. */}
                <span className="min-w-0 flex-1 text-[0.875rem]">
                  {category.categoryName}
                </span>
                {/* A dash rather than 0, and the same dash for the share. Zero
                    is a measurement; a dash says "nothing here", and the eye
                    skips it instead of counting it. */}
                <span className="tabular text-[0.75rem] text-ink-label">
                  {category.count === 0 ? (
                    <>
                      —<span className="sr-only"> no marks</span>
                    </>
                  ) : (
                    <>
                      {category.count}
                      <span className="sr-only">
                        {category.count === 1 ? " mark" : " marks"}
                      </span>
                    </>
                  )}
                </span>
                {/* Whole percentages. The table this replaced printed one
                    decimal so a column of them could be added up; nothing here
                    adds them up, and "33%" is read faster than "32.9%". */}
                <span className="tabular w-[42px] text-right text-[0.75rem] text-ink-muted">
                  {category.count === 0 ? "—" : `${Math.round(category.share * 100)}%`}
                </span>
              </span>

              {/* The track is drawn for an empty category too. The row is there to
                  say the category exists and had nothing, and a missing bar would
                  look like a broken one. */}
              <span
                aria-hidden="true"
                className="h-[7px] overflow-hidden rounded-full bg-ink/[0.06]"
              >
                <span
                  // An inline width because the value is a number Tailwind
                  // never sees. The transition runs only when the width
                  // changes, which means only when the range does.
                  style={{ width: `${width}%` }}
                  className={`block h-full rounded-full transition-[width] duration-200 ease-out motion-reduce:transition-none ${tone.soft}`}
                />
              </span>
            </li>
          );
        })}
      </ul>

      <div className="flex justify-between border-t border-hairline pt-3 text-[0.78rem] text-ink-muted">
        <span>Total</span>
        <span className="tabular">
          {tally.total} mark{tally.total === 1 ? "" : "s"}
        </span>
      </div>
    </section>
  );
}
