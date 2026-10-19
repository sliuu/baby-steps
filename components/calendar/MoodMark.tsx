import { MoodFace } from "@/components/ui/Mood";
import { MOOD_BG, MOOD_LABEL, type Mood } from "@/lib/moods";

/** Face on its mood colour, self-labelled. Calendar cells use `MoodDot` instead. */
export function MoodMark(props: { mood: Mood }) {
  return (
    <span
      title={MOOD_LABEL[props.mood]}
      className={`grid size-6 shrink-0 place-items-center rounded-full ${MOOD_BG[props.mood]}`}
    >
      <MoodFace mood={props.mood} />
      <span className="sr-only">Mood: {MOOD_LABEL[props.mood]}</span>
    </span>
  );
}
