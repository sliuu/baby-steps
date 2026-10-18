"use client";

import {
  addTransitionType,
  startTransition,
  useEffect,
  useMemo,
  useRef,
  useState,
  ViewTransition,
  type ReactNode,
} from "react";
import { startOfMonth } from "date-fns";

import { DayPanel } from "./DayPanel";
import { DaySheet } from "./DaySheet";
import { MonthDots } from "./MonthDots";
import { MonthGrid } from "./MonthGrid";
import { PeriodHeader } from "./PeriodHeader";
import { TodayView } from "./TodayView";
import { WeekGrid } from "./WeekGrid";
import { WeekList } from "./WeekList";
import { LANDING_VIEW, type CalendarViewMode, type PeriodProps } from "./period";
import type { LibraryGroup } from "@/lib/queries/activities";
import {
  formatMonthTitle,
  formatWeekTitle,
  formatWeekTitleShort,
  fromDayString,
  toDayString,
  type DayString,
  stepMonth,
  stepWeek,
  toMonthString,
  toWeekString,
} from "@/lib/dates";
import { NO_STICKERS } from "@/lib/stickers";
import { useToday } from "@/lib/useToday";
import { useSettings } from "@/components/SettingsProvider";

type Props = Omit<PeriodProps, "todayString" | "onOpenDay" | "selectedDay"> & {
  /** The server's day; the anchor until the browser knows better. */
  initialDay: string;
  /** For Today's flower and the phone month's dots. */
  groups: LibraryGroup[];
  /** Null draws the landing. */
  view: CalendarViewMode | null;
  /** The last failed write, for the sheet's live region. */
  error: string | null;
  /** The compact tray, adding to a day. `scope` keeps drag ids unique. */
  tray: (day: DayString, scope: string) => ReactNode;
  /** Phones: opens the add-stickers sheet. */
  onPickStickers: () => void;
};

/** Owns the period anchor, the selected day (desktop) and the open sheet (phones). */
export function CalendarPanel(props: Props) {
  const { weekStartsOn } = useSettings();
  // Null on the server and during hydration, so no cell is wrongly today.
  const todayString = useToday(null);
  const today = todayString ?? props.initialDay;

  // Null until an arrow is pressed; follows the clock until then.
  const [chosenDay, setChosenDay] = useState<Date | null>(null);
  const anchor = useMemo(() => chosenDay ?? fromDayString(today), [chosenDay, today]);
  const month = useMemo(() => startOfMonth(anchor), [anchor]);

  // Desktop panel's day; null means today.
  const [selected, setSelected] = useState<DayString | null>(null);
  const selectedDay = selected ?? today;
  // Phones: the sheet's day, null when shut.
  const [sheetDay, setSheetDay] = useState<DayString | null>(null);

  const passthrough: PeriodProps = {
    stickersByDay: props.stickersByDay,
    onOpenDay: setSelected,
    selectedDay,
    onCommit: props.onCommit,
    highlight: props.highlight,
    target: props.target,
    caret: props.caret,
    landed: props.landed,
    todayString,
  };

  const showDay = (day: Date) => setSheetDay(toDayString(day));

  // New day: the side panel starts at the top.
  const asideRef = useRef<HTMLElement>(null);
  useEffect(() => {
    asideRef.current?.scrollTo({ top: 0 });
  }, [selectedDay]);

  const body = (view: CalendarViewMode) => {
    if (view === "today") {
      return (
        <TodayView
          day={today}
          groups={props.groups}
          onAddSticker={() =>
            document.getElementById("your-stickers")?.scrollIntoView({ behavior: "smooth" })
          }
          onPickStickers={props.onPickStickers}
          {...passthrough}
        />
      );
    }

    const week = view === "week";
    const title = week ? formatWeekTitle(anchor, weekStartsOn) : formatMonthTitle(month);
    const shortTitle = week ? formatWeekTitleShort(anchor, weekStartsOn) : undefined;
    // View in the key: month → week is a swap, not a morph.
    const periodKey = week ? `week:${toWeekString(anchor, weekStartsOn)}` : `month:${toMonthString(month)}`;

    // Needs startTransition + a direction type + a changed key for the deck slide.
    const step = (by: number) => {
      startTransition(() => {
        addTransitionType(by > 0 ? "step-next" : "step-previous");
        setChosenDay(week ? stepWeek(anchor, by, weekStartsOn) : stepMonth(month, by));
      });
    };

    return (
      <section className="flex flex-col gap-8" data-period={periodKey}>
        <PeriodHeader title={title.toLowerCase()} shortTitle={shortTitle?.toLowerCase()} view={view} onStep={step} />

        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start lg:gap-10">
          {/* default="none", or every drop (a transition) would slide the month. */}
          <ViewTransition
            key={periodKey}
            enter={{ "step-next": "deck-next", "step-previous": "deck-previous", default: "none" }}
            exit={{ "step-next": "deck-next", "step-previous": "deck-previous", default: "none" }}
            default="none"
          >
            {/* Both drawings ship and CSS picks: no width flash. */}
            <div className="min-w-0">
              {week ? (
                <>
                  <WeekList className="lg:hidden" anchor={anchor} onShowDay={showDay} {...passthrough} />
                  <WeekGrid className="hidden lg:grid" anchor={anchor} {...passthrough} />
                </>
              ) : (
                <>
                  <MonthDots
                    className="lg:hidden"
                    month={month}
                    groups={props.groups}
                    onShowDay={showDay}
                    {...passthrough}
                  />
                  <MonthGrid className="hidden lg:grid" month={month} {...passthrough} />
                </>
              )}
            </div>
          </ViewTransition>

          {/* The side panel. Sticky; scrolls on its own when the bank is long. */}
          <aside
            ref={asideRef}
            aria-label="selected day"
            className="scrollbar-app hidden lg:sticky lg:top-6 lg:block lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto lg:border-l lg:border-rule lg:pr-4 lg:pl-4"
          >
            <DayPanel
              day={selectedDay}
              stickers={props.stickersByDay.get(selectedDay) ?? NO_STICKERS}
              onCommit={props.onCommit}
              tray={props.tray(selectedDay, "panel")}
            />
          </aside>
        </div>
      </section>
    );
  };

  return (
    <>
      {body(props.view ?? LANDING_VIEW)}
      <DaySheet
        day={sheetDay}
        onClose={() => setSheetDay(null)}
        stickersByDay={props.stickersByDay}
        onCommit={props.onCommit}
        tray={props.tray}
        error={props.error}
      />
    </>
  );
}
