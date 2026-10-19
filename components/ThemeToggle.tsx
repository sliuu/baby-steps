"use client";

import { Moon, Sun } from "lucide-react";

import { THEME_STORAGE_KEY, type Theme } from "@/lib/theme";

const ICON = "size-4.5";

/** Header icon to the other theme: a moon in light, a sun in dark. Swapped in CSS, so the server needn't know the theme. */
export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const next: Theme = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={toggle}
      // Negative margin: the hit area doesn't grow the header.
      className="-my-1.5 grid size-8 place-items-center rounded-full text-ink-muted transition-colors hover:bg-secondary hover:text-ink"
    >
      <span className="contents dark:hidden">
        <Moon className={ICON} strokeWidth={1.5} aria-hidden="true" />
        <span className="sr-only">dark mode</span>
      </span>
      <span className="hidden dark:contents">
        <Sun className={ICON} strokeWidth={1.5} aria-hidden="true" />
        <span className="sr-only">light mode</span>
      </span>
    </button>
  );
}
