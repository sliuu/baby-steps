import Link from "next/link";

import { StickerMark } from "@/components/calendar/StickerMark";
import { Button } from "@/components/ui/button";
import { MoodDot } from "@/components/ui/Mood";
import { NoticePage } from "@/components/ui/NoticePage";
import type { Mood } from "@/lib/moods";
import type { StickerFace } from "@/lib/stickers";

const MONDAY: StickerFace[] = [
  { name: "gym", mark: "icon:dumbbell", colorKey: "bottle" },
  { name: "meditate", mark: "icon:sparkles", colorKey: "oxblood" },
];

const WEDNESDAY: StickerFace[] = [
  { name: "piano", mark: "icon:piano", colorKey: "rose" },
  { name: "date night", mark: "icon:heart", colorKey: "sage" },
];

/** Unmatched URL: three calendar days, the middle one missing. */
export default function NotFound() {
  return (
    <NoticePage
      eyebrow="page not found"
      title="there’s no such day"
      picture={
        // A visual pun; the heading says it in words.
        <div aria-hidden="true" className="mb-10 inline-grid animate-rise grid-cols-3">
          {["mon", "tue", "wed"].map((day, i) => (
            <div key={day} className={`daylabel pb-2 ${i > 0 ? "border-l border-rule-grid pl-3" : ""}`}>
              {day}
            </div>
          ))}
          <DayFace numeral="12" mood="good" stickers={MONDAY} />
          <DayFace numeral="404" mood="rough" stickers={[]} missing />
          <DayFace numeral="14" mood="great" stickers={WEDNESDAY} />
        </div>
      }
      action={
        <Button asChild variant="filled" size="md">
          <Link href="/">back to the calendar</Link>
        </Button>
      }
    >
      this link points at a day that was never in your calendar. everything you&rsquo;ve filled in is
      where you left it.
    </NoticePage>
  );
}

/** Looks like a `DayCell` without being a drop target (keeps this a server page). */
function DayFace(props: { numeral: string; mood: Mood; stickers: StickerFace[]; missing?: boolean }) {
  return (
    <div
      className={`flex min-h-24 w-24 flex-col border-t border-rule-grid pt-2.5 pr-3 sm:w-28 ${
        props.numeral === "12" ? "" : "border-l pl-3"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`oldstyle text-label text-ink ${
            props.missing ? "rounded-full px-2 ring-1 ring-accent-ink text-accent-ink" : ""
          }`}
        >
          {props.numeral}
        </span>
        <MoodDot mood={props.mood} />
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {props.stickers.map((sticker) => (
          <StickerMark key={sticker.name} sticker={sticker} size="xs" />
        ))}
      </div>
    </div>
  );
}
