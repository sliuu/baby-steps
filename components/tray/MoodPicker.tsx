"use client";

import { useDraggable } from "@dnd-kit/core";
import { useRef } from "react";

import { MoodFace } from "@/components/ui/Mood";
import type { DragPayload } from "@/components/dnd/payload";
import { TRAY_INSET } from "@/lib/layout";
import { MOOD_BG, MOOD_LABEL, MOODS, type Mood } from "@/lib/moods";

type Props = {
  /** Which mood is lit, or null when the selection is something else. */
  selected: Mood | null;
  /** Always a mood; the tray decides whether picking the lit one means "clear". */
  onToggle: (mood: Mood) => void;
  className?: string;
};

/**
 * The tray's five moods as a radio group. Selecting lights that mood's days;
 * pressing the lit one clears it. Each circle is also draggable onto a day
 * (Space starts a keyboard drag; arrows move the selection).
 */
export function MoodPicker(props: Props) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  // Roving tabindex: the lit mood, else the first.
  const tabStop = props.selected ? MOODS.indexOf(props.selected) : 0;

  function step(from: number, by: number) {
    const next = (from + by + MOODS.length) % MOODS.length;
    props.onToggle(MOODS[next]);
    refs.current[next]?.focus();
  }

  return (
    <section className={props.className}>
      <p className={`${TRAY_INSET} text-label text-ink-muted`}>
        how are you feeling?
      </p>

      <div
        role="radiogroup"
        aria-label="mood"
        // Up to 44px each; shrinks to fit the rail.
        className={`${TRAY_INSET} mt-2 grid grid-cols-5 gap-1`}
      >
        {MOODS.map((mood, index) => (
          <MoodChoice
            key={mood}
            mood={mood}
            index={index}
            selected={props.selected === mood}
            tabbable={index === tabStop}
            buttonRef={(el) => {
              refs.current[index] = el;
            }}
            onToggle={() => props.onToggle(mood)}
            onStep={(by) => step(index, by)}
          />
        ))}
      </div>
    </section>
  );
}

const STEP_KEYS: Record<string, number> = {
  ArrowRight: 1,
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowUp: -1,
};

function MoodChoice(props: {
  mood: Mood;
  index: number;
  selected: boolean;
  tabbable: boolean;
  buttonRef: (el: HTMLButtonElement | null) => void;
  onToggle: () => void;
  onStep: (by: number) => void;
}) {
  const payload: DragPayload = { kind: "mood", mood: props.mood };
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: props.mood,
    data: payload,
  });

  return (
    <button
      ref={(el) => {
        setNodeRef(el);
        props.buttonRef(el);
      }}
      type="button"
      {...listeners}
      {...attributes}
      // After the spread: dnd-kit sets role="button" and tabIndex 0.
      role="radio"
      aria-checked={props.selected}
      aria-label={MOOD_LABEL[props.mood].toLowerCase()}
      tabIndex={props.tabbable ? 0 : -1}
      onKeyDown={(event) => {
        const by = STEP_KEYS[event.key];
        if (by !== undefined && !isDragging) {
          event.preventDefault();
          props.onStep(by);
          return;
        }
        listeners?.onKeyDown?.(event);
      }}
      onClick={props.onToggle}
      className={`grid aspect-square w-full max-w-11 touch-none place-items-center rounded-full transition-opacity ${
        MOOD_BG[props.mood]
      } ${
        props.selected
          ? "inset-ring-2 inset-ring-accent-ink"
          : "inset-ring-1 inset-ring-rule"
      } ${isDragging ? "opacity-35" : "cursor-grab active:cursor-grabbing"}`}
    >
      <MoodFace mood={props.mood} className="size-3/5" />
    </button>
  );
}
