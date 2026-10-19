"use client";

import {
  createContext,
  useContext,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import type { StickersByDay } from "@/lib/stickers";

export type CalendarSnapshot = {
  /** The server value this local copy was derived from. */
  source: StickersByDay;
  data: StickersByDay;
};

type CalendarData = {
  snapshot: CalendarSnapshot | null;
  setSnapshot: Dispatch<SetStateAction<CalendarSnapshot | null>>;
};

const CalendarDataContext = createContext<CalendarData | null>(null);

/** Keeps confirmed edits across Calendar/Trends switches, so no refetch per edit. */
export function CalendarDataProvider(props: { children: React.ReactNode }) {
  const [snapshot, setSnapshot] = useState<CalendarSnapshot | null>(null);
  return (
    <CalendarDataContext value={{ snapshot, setSnapshot }}>
      {props.children}
    </CalendarDataContext>
  );
}

export function useCalendarData() {
  const value = useContext(CalendarDataContext);
  if (!value) {
    throw new Error("useCalendarData must be used inside CalendarDataProvider");
  }
  return value;
}
