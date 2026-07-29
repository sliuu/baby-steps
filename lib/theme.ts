export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "baby-steps-theme";

/**
 * Runs in <head>, before the browser paints anything.
 *
 * Without this, the page would render in light, then React would hydrate,
 * read localStorage, and slam it to dark — a visible white flash on every
 * load. This is the one place a blocking inline <script> is the right call.
 */
export const THEME_INIT_SCRIPT = `(function () {
  try {
    var stored = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
    var theme =
      stored === "light" || stored === "dark"
        ? stored
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.dataset.theme = theme;
  } catch (e) {}
})();`;
