import { MOOD_MOUTH, MOOD_BG, type Mood } from "@/lib/moods";
import { cn } from "@/lib/utils";

const FACE_SIZE = { sm: "size-5", md: "size-6", lg: "size-7" } as const;

/** Head, eyes, mouth in ink. Decorative; callers name it. */
export function MoodFace(props: {
  mood: Mood;
  size?: keyof typeof FACE_SIZE;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={cn("shrink-0 text-ink", FACE_SIZE[props.size ?? "sm"], props.className)}
    >
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="9" cy="9.5" r="1.05" fill="currentColor" />
      <circle cx="15" cy="9.5" r="1.05" fill="currentColor" />
      <path
        d={MOOD_MOUTH[props.mood]}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Mood colour dot for calendar cells. Decorative; the cell says the word. */
export function MoodDot(props: { mood: Mood; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "block size-mood-dot shrink-0 rounded-full inset-ring-1 inset-ring-rule",
        MOOD_BG[props.mood],
        props.className,
      )}
    />
  );
}
