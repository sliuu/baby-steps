import { ramp } from "@/lib/palette";
import type { LifeArea } from "@/lib/queries/lifeAreas";

type Props = {
  areas: LifeArea[];
};

export function LifeAreaChips(props: Props) {
  return (
    // Stacked and content-width, not stretched: in the rail this reads as a
    // legend, and full-width pills would imply each one is a button.
    <ul className="flex flex-wrap items-start gap-2 lg:flex-col lg:flex-nowrap">
      {props.areas.map((area) => {
        // The soft end, the same fill a sticker gets. The legend has to be the
        // colour it's explaining — a saturated dot beside pastel circles reads
        // as a different scale rather than a key to one.
        const { soft } = ramp(area.colorKey);
        return (
          <li
            key={area.id}
            className="flex items-center gap-2 rounded-full border border-hairline bg-surface py-1.5 pl-2.5 pr-4 text-sm"
          >
            {/* Slightly larger than the old saturated dot — a pastel needs more
                area to register at all against the surface. */}
            <span className={`size-3.5 rounded-full ${soft}`} aria-hidden />
            {area.name}
          </li>
        );
      })}
    </ul>
  );
}
