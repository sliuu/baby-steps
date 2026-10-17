import type { Tally } from "@/lib/analytics";
import { categoryColor } from "@/lib/palette";

type Props = {
  tally: Tally;
  caption: string;
};

/** Categories ranked by marks, as bars in their ink. */
export function CategoryBars(props: Props) {
  const { tally } = props;

  const ranked = [...tally.categories].sort((a, b) => b.count - a.count);
  const most = ranked[0]?.count ?? 0;

  return (
    <section aria-label={props.caption} className="flex flex-col gap-4">
      <ul className="flex flex-col gap-3.5">
        {ranked.map((category) => {
          const tone = categoryColor(category.colorKey);
          const width = most === 0 ? 0 : (category.count / most) * 100;

          return (
            <li key={category.categoryId} className="flex flex-col gap-1.5">
              <span className="flex items-center gap-2">
                {/* Wraps rather than truncates on narrow phones. */}
                <span className={`min-w-0 flex-1 text-label lowercase ${tone.text}`}>
                  {category.categoryName}
                </span>
                {/* Dash, not 0: "nothing here". */}
                <span className="tabular text-caption text-ink">
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
                <span className="tabular w-10 text-right text-caption text-ink-muted">
                  {category.count === 0 ? "—" : `${Math.round(category.share * 100)}%`}
                </span>
              </span>

              {/* Track drawn even when empty, so the row doesn't look broken. */}
              <span aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-rule-grid">
                <span
                  style={{ width: `${width}%` }}
                  className={`block h-full rounded-full transition-[width] duration-200 ease-out motion-reduce:transition-none ${tone.ink}`}
                />
              </span>
            </li>
          );
        })}
      </ul>

      <div className="flex justify-between border-t border-rule pt-3 text-caption text-ink-muted">
        <span>total</span>
        <span className="tabular">
          {tally.total} mark{tally.total === 1 ? "" : "s"}
        </span>
      </div>
    </section>
  );
}
