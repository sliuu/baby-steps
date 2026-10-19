"use client";

import { createContext, useContext } from "react";

import { DEFAULT_SETTINGS, type Settings } from "@/lib/settings";

const SettingsContext = createContext<Settings>(DEFAULT_SETTINGS);

export function SettingsProvider(props: { settings: Settings; children: React.ReactNode }) {
  return <SettingsContext value={props.settings}>{props.children}</SettingsContext>;
}

export function useSettings(): Settings {
  return useContext(SettingsContext);
}
