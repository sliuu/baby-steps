"use client";

import { useState, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { THEME_STORAGE_KEY, type Theme } from "@/lib/theme";

/** The <head> script owns the class; nothing else changes it behind our back. */
const noSubscription = () => () => {};

export function ThemeToggle() {
  // The inline script in <head> already set the real theme before paint, but
  // the server has no DOM to read it from. useSyncExternalStore's third
  // argument is the server-and-hydration value, so the icon renders nothing
  // until the browser can answer — rather than flashing the wrong one.
  const domTheme = useSyncExternalStore<Theme | null>(
    noSubscription,
    () => (document.documentElement.classList.contains("dark") ? "dark" : "light"),
    () => null,
  );

  const [chosen, setChosen] = useState<Theme | null>(null);
  const theme = chosen ?? domTheme;
  const ready = theme !== null;

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setChosen(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    document.documentElement.dataset.theme = next;
    localStorage.setItem(THEME_STORAGE_KEY, next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      className="grid size-9 cursor-pointer place-items-center rounded-full text-ink-muted transition-colors hover:bg-secondary hover:text-ink"
    >
      {/* Until the effect runs we don't know the theme; render nothing rather
          than flash the wrong icon. */}
      {ready ? (
        theme === "dark" ? (
          <Sun className="size-[18px]" strokeWidth={1.5} />
        ) : (
          <Moon className="size-[18px]" strokeWidth={1.5} />
        )
      ) : null}
    </button>
  );
}
