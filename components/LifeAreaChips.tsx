import { ramp } from "@/lib/palette";
import type { LifeArea } from "@/lib/queries/lifeAreas";

type Props = {
  areas: LifeArea[];
};

export function LifeAreaChips(props: Props) {
  return (
    <ul className="flex flex-wrap items-center justify-center gap-2">
      {props.areas.map((area) => {
        const { bg } = ramp(area.colorKey);
        return (
          <li
            key={area.id}
            className="flex items-center gap-2 rounded-full border border-hairline bg-surface py-1.5 pl-2.5 pr-4 text-sm"
          >
            <span className={`size-2.5 rounded-full ${bg}`} aria-hidden />
            {area.name}
          </li>
        );
      })}
    </ul>
  );
}
