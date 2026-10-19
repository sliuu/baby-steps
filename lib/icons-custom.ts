import { createLucideIcon } from "lucide-react";

/**
 * Sports icons Lucide lacks, drawn to its grid via `createLucideIcon` so they match.
 * Rules: 24×24, inside 2→22; half-units at most; 3–5 elements; never `fill`.
 * `.ts`, not `.tsx`: imported by modules that run under node --test.
 */

/** Tennis: head at 45° (not a frying pan); short strings (not a magnifier). */
export const Tennis = createLucideIcon("tennis", [
  [
    "ellipse",
    {
      cx: "14.5",
      cy: "9.5",
      rx: "4.5",
      ry: "5.5",
      transform: "rotate(45 14.5 9.5)",
      key: "head",
    },
  ],
  ["path", { d: "M10.6 13.4 5 19", key: "handle" }],
  ["path", { d: "m12.3 7.7 4.4 3.6", key: "string-a" }],
  ["path", { d: "m12.3 11.3 4.4-3.6", key: "string-b" }],
  ["circle", { cx: "5.5", cy: "7", r: "2.5", key: "ball" }],
]);

/** Ball: straight horizontal seam, two bowed verticals. */
export const Basketball = createLucideIcon("basketball", [
  ["circle", { cx: "12", cy: "12", r: "9", key: "ball" }],
  ["path", { d: "M3 12h18", key: "seam-across" }],
  ["path", { d: "M7.5 4c3 4 3 12 0 16", key: "seam-left" }],
  ["path", { d: "M16.5 4c-3 4-3 12 0 16", key: "seam-right" }],
]);

/** Golf: open pennant, and the hole in perspective (not Lucide's `flag`). */
export const Golf = createLucideIcon("golf", [
  ["path", { d: "M6 3v16", key: "pin" }],
  ["path", { d: "m6 4 9 3-9 3", key: "pennant" }],
  ["ellipse", { cx: "10", cy: "19.5", rx: "6.5", ry: "2.5", key: "hole" }],
]);

/** Crossed skis, low crossing and hooked tips: not an X, waves or swords. */
export const Ski = createLucideIcon("ski", [
  ["path", { d: "M13.5 21 6.6 8.6c-.8-1.5-2.2-2-3.6-1.1", key: "ski-a" }],
  ["path", { d: "M10.5 21 17.4 8.6c.8-1.5 2.2-2 3.6-1.1", key: "ski-b" }],
]);

/** Surf: a 5:1 board (a leaf is ~2.5:1) above a wave. */
export const Surf = createLucideIcon("surf", [
  [
    "path",
    { d: "M20 2.5Q17 11.3 9.2 15.2L6.8 12.8Q11 5.2 20 2.5z", key: "board" },
  ],
  ["path", { d: "M17.5 4.9 9.9 12.2", key: "stringer" }],
  [
    "path",
    { d: "M2 19.5c2.2 0 2.8-2 5-2s2.8 2 5 2 2.8-2 5-2 2.8 2 5 2", key: "wave" },
  ],
]);

/** Rowing: scull from above, offset oars with blades. */
export const Rowing = createLucideIcon("rowing", [
  ["path", { d: "M2 12c5-2.5 15-2.5 20 0-5 2.5-15 2.5-20 0z", key: "shell" }],
  ["path", { d: "M9 11.2 6 5.5", key: "oar-a" }],
  ["path", { d: "m4.45 6.32 3.1-1.64", key: "blade-a" }],
  ["path", { d: "m15 12.8 3 5.7", key: "oar-b" }],
  ["path", { d: "m16.45 19.32 3.1-1.64", key: "blade-b" }],
]);

/** Climbing: carabiner with a straight spine (not a letter); 9:19 (wider = phone). */
export const Carabiner = createLucideIcon("carabiner", [
  [
    "path",
    {
      d: "M16.5 13.5V17a4.5 4.5 0 0 1-4.5 4.5h-2A2.5 2.5 0 0 1 7.5 19V5A2.5 2.5 0 0 1 10 2.5h2A4.5 4.5 0 0 1 16.5 7v3.5",
      key: "body",
    },
  ],
  ["path", { d: "M16.5 13.5c-1.8-.8-2.5-2.1-2.1-3.9", key: "gate" }],
]);

/** Yoga: lotus, legs wider than the arms so it isn't a pawn or a top. */
export const Lotus = createLucideIcon("lotus", [
  ["circle", { cx: "12", cy: "4.5", r: "2.2", key: "head" }],
  ["path", { d: "M12 8.2 6.5 14.8", key: "arm-a" }],
  ["path", { d: "M12 8.2 17.5 14.8", key: "arm-b" }],
  ["path", { d: "m3.5 16.2 4.3 3.3 4.2-2.6 4.2 2.6 4.3-3.3", key: "legs" }],
]);
