"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { THEME_STORAGE_KEY, type Theme } from "@/lib/theme";

export function ThemeToggle() {
  // The inline script in <head> already set the real theme before paint.
  // We can't read it during render (the server has no DOM), so we start
  // with a placeholder and sync in an effect.
  const [theme, setTheme] = useState<Theme>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    setReady(true);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
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
