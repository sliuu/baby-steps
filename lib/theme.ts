export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "baby-steps-theme";

/**
 * Blocking <head> script: sets `data-theme` before paint, so no light flash.
 * A saved choice wins; otherwise it follows the system, live.
 */
export const THEME_INIT_SCRIPT = `(function () {
  try {
    var root = document.documentElement;
    var query = window.matchMedia("(prefers-color-scheme: dark)");
    var saved = function () {
      var stored = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
      return stored === "light" || stored === "dark" ? stored : null;
    };
    root.dataset.theme = saved() || (query.matches ? "dark" : "light");
    query.addEventListener("change", function (event) {
      if (!saved()) root.dataset.theme = event.matches ? "dark" : "light";
    });
  } catch (e) {}
})();`;
