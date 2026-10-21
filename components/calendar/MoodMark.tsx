import { MoodFace } from "@/components/ui/Mood";
import { MOOD_BG, MOOD_LABEL, type Mood } from "@/lib/moods";

/** Face on its mood colour, self-labelled, drawn like Today's. Calendar cells use `MoodDot` instead. */
export function MoodMark(props: { mood: Mood }) {
  return (
    <span
      title={MOOD_LABEL[props.mood]}
      className={`grid size-7 shrink-0 place-items-center rounded-full inset-ring-1 inset-ring-rule ${MOOD_BG[props.mood]}`}
    >
      <MoodFace mood={props.mood} className="size-3/5" />
      <span className="sr-only">Mood: {MOOD_LABEL[props.mood]}</span>
    </span>
  );
}
