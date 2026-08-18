import { MOOD_LABEL, MOOD_MOUTH, type Mood } from "@/lib/moods";

type Props = {
  mood: Mood;
};

/**
 * A mood is not a sticker, so it doesn't look like one. Stickers are filled
 * pastel circles that wrap under the date; this is an outlined face in plain
 * ink, sitting up on the date's own line. Different shape, different weight,
 * different place — you can tell them apart without reading either.
 *
 * No colour at all. The five moods are distinguished by the mouth, which means
 * they still work in greyscale and never compete with the six area hues below.
 */
export function MoodMark(props: Props) {
  return (
    <span title={MOOD_LABEL[props.mood]} className="shrink-0 text-ink">
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
        <circle
          cx="12"
          cy="12"
          r="9"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
        />
        {/* Eyes sit high enough that the mouth has room to curve either way. */}
        <circle cx="9" cy="9.5" r="1.05" fill="currentColor" />
        <circle cx="15" cy="9.5" r="1.05" fill="currentColor" />
        <path
          d={MOOD_MOUTH[props.mood]}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
        />
      </svg>
      <span className="sr-only">Mood: {MOOD_LABEL[props.mood]}</span>
    </span>
  );
}
