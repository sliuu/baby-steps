import { MoodMark } from "@/components/calendar/MoodMark";
import { MOOD_PLOT, level } from "@/components/trends/MoodLine";
import { MOOD_SCORE, type MoodTally } from "@/lib/analytics";
import { MOOD_BG } from "@/lib/moods";

/** Days per mood, great at the top; each row on the day-by-day chart's gridline. */
export function MoodBars(props: { moods: MoodTally }) {
  const { moods, total } = props.moods;

  if (total === 0) {
    return (
      <p className="text-label text-ink-muted">
        no moods logged yet. pick one on today or any day in the calendar.
      </p>
    );
  }

  const most = Math.max(...moods.map((entry) => entry.count));

  return (
    <div className={MOOD_PLOT}>
      <ul className="relative size-full">
        {[...moods].reverse().map((entry) => (
          <li
            key={entry.mood}
            style={{ top: `${level(MOOD_SCORE[entry.mood])}%` }}
            className="absolute inset-x-0 flex -translate-y-1/2 items-center gap-s1"
          >
            <MoodMark mood={entry.mood} />

            <span aria-hidden="true" className="h-2 flex-1 overflow-hidden rounded-full bg-rule-grid">
              <span
                style={{ width: `${(entry.count / most) * 100}%` }}
                className={`block h-full rounded-full transition-[width] duration-200 ease-out motion-reduce:transition-none ${MOOD_BG[entry.mood]}`}
              />
            </span>

            {/* Dash, not 0: "nothing here". */}
            <span className="tabular w-6 text-right text-caption text-ink">
              {entry.count === 0 ? (
                <>
                  —<span className="sr-only"> no days</span>
                </>
              ) : (
                <>
                  {entry.count}
                  <span className="sr-only">{entry.count === 1 ? " day" : " days"}</span>
                </>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
