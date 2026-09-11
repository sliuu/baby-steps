import { createLucideIcon } from "lucide-react";

/**
 * The eight pictures Lucide doesn't draw.
 *
 * Lucide ships 1,757 icons and its sports vocabulary is eighteen of them:
 * dumbbell, volleyball, football, bike, kayak, swimming, a shoe, footprints,
 * fencing, archery, six chess pieces, a medal, a trophy and a weight. There is
 * no tennis. No racket of any kind, no basketball, no golf, no ski, no skate,
 * no surf, no boxing, no rowing, no climbing, no yoga pose. That is not a gap
 * in the curation in `lib/icons.ts` — the package does not contain them.
 *
 * The obvious fix is a second icon family, and it is the wrong one: the whole
 * point of the icon work is that every mark in the app is one weight and one
 * style, and Phosphor's tennis racket next to Lucide's dumbbell is two sets
 * pretending to be one. Corner radii, terminal shapes and optical weight all
 * differ, and at 26px in a calendar cell you read the difference before you
 * read the picture.
 *
 * So these are drawn to Lucide's own grid instead, and built with Lucide's own
 * factory. `createLucideIcon` is what every icon in the package is made with:
 * it returns the same `forwardRef` component, handles `size`, `color`,
 * `strokeWidth` and `absoluteStrokeWidth` the same way, and produces the same
 * `<svg>` with the same defaults — `fill="none"`, `stroke="currentColor"`,
 * `stroke-width="2"`, round caps and joins, `viewBox="0 0 24 24"`. Nothing
 * downstream can tell these apart from the real ones, which is the point.
 * `MARK_STROKE` reaches them through the same prop.
 *
 * **The rules the geometry follows**, so a ninth one matches the eight:
 *
 * - 24 × 24 box, everything inside 2 → 22. The two units of margin are what
 *   keep the 2-unit stroke from clipping at the edge.
 * - Coordinates land on the half-unit where they can. Lucide's grid is whole
 *   units; a half is the concession a diagonal makes.
 * - Simple shapes and few of them. Three to five elements is the house style,
 *   and it is a legibility rule rather than a taste one — this has to survive
 *   being drawn at 26px in a calendar cell, where a sixth line becomes noise.
 * - No `fill`, ever. These are line drawings, and a filled counter would read
 *   as a different weight beside 424 that aren't.
 *
 * `.ts` rather than `.tsx` deliberately: `createLucideIcon` takes data, not
 * JSX, so this file has no syntax a bundler is needed for. `lib/icons.ts`
 * imports it, `lib/stickers.ts` imports that, and `lib/stickers.test.ts` runs
 * under `node --test` with no bundler at all.
 *
 * The `key` on each element is Lucide's own convention — the factory maps the
 * array into React children and React wants a key. The values are arbitrary and
 * only have to be unique within one icon.
 */

/**
 * A racket, its strings, and a ball.
 *
 * The head is an ellipse turned 45° so its long axis runs down-left to
 * up-right, which is the direction the handle leaves from — a racket drawn with
 * a round head and a handle coming off it at an angle reads as a frying pan.
 * The two crossed strings are what stop the remaining reading, a magnifying
 * glass, and they are short rather than full chords because a full grid at this
 * size fills in to a grey blob.
 */
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

/**
 * A ball and three seams.
 *
 * The horizontal seam is a straight diameter and the two vertical ones bow away
 * from centre, which is the projection you actually see on a ball rather than
 * the flat cross that a straight vertical seam would give. Four elements, and
 * the fifth candidate — a straight vertical centre seam — was dropped because
 * the two curves already cross top and bottom and read as one.
 */
export const Basketball = createLucideIcon("basketball", [
  ["circle", { cx: "12", cy: "12", r: "9", key: "ball" }],
  ["path", { d: "M3 12h18", key: "seam-across" }],
  ["path", { d: "M7.5 4c3 4 3 12 0 16", key: "seam-left" }],
  ["path", { d: "M16.5 4c-3 4-3 12 0 16", key: "seam-right" }],
]);

/**
 * A pin, its flag, and the hole.
 *
 * The pennant is drawn open rather than closed — two strokes making a V on its
 * side, not a filled triangle — so it keeps the same weight as everything
 * around it. The ellipse under the pin is the hole read in perspective, and it
 * is what separates this from Lucide's own `flag`.
 */
export const Golf = createLucideIcon("golf", [
  ["path", { d: "M6 3v16", key: "pin" }],
  ["path", { d: "m6 4 9 3-9 3", key: "pennant" }],
  ["ellipse", { cx: "10", cy: "19.5", rx: "6.5", ry: "2.5", key: "hole" }],
]);

/**
 * Two skis crossed, tips flaring.
 *
 * The first four drafts drew them side on, tips up, on the theory that a ski
 * is recognised by its tip. It isn't, at 17px: two long strokes of the same
 * length curving the same way are a repeat, and a repeat of a curve is
 * Lucide's own `waves`. Staggering them along their axes broke the repeat and
 * still left a swoosh — the shape said "motion", never "ski".
 *
 * Crossed is the arrangement everything from a piste map to a resort sign
 * uses. Crossed at the *middle* is not: that draws an even X, and an even X in
 * a habit picker is a delete button. The shafts cross three units off the
 * bottom instead, so almost the whole drawing is the splay above the crossing
 * and the shape reads as a pair of long objects leaning together. The tips
 * then hook outward, away from each other, which is the detail that separates
 * this from Lucide's `swords` — there the blades rise parallel above a pair of
 * hilts, here nothing is parallel and there is no furniture at the bottom.
 */
export const Ski = createLucideIcon("ski", [
  ["path", { d: "M13.5 21 6.6 8.6c-.8-1.5-2.2-2-3.6-1.1", key: "ski-a" }],
  ["path", { d: "M10.5 21 17.4 8.6c.8-1.5 2.2-2 3.6-1.1", key: "ski-b" }],
]);

/**
 * A board above water.
 *
 * Three drafts of this were Lucide's `leaf` with a wave underneath, and the
 * fix was never the tail or the midrib — it was the proportion. A leaf is
 * about two and a half times longer than it is wide; a board is five. Drawn at
 * 5:1 the shape stops being a lens and becomes a sliver, and no leaf in any
 * icon set is that thin. The flat-cut tail and the stringer that stops short
 * of both ends are what confirm it once the proportion has done the work.
 */
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

/**
 * A shell from above, with two oars out.
 *
 * Overhead rather than side-on, because side-on is a person on a machine and
 * that needs a figure. The blades are short strokes across the end of each oar
 * — without them the oars read as two stray ticks, and with them the whole
 * thing reads as a scull. The oars are offset rather than opposite, which is
 * how a single sculler's actually sit.
 */
export const Rowing = createLucideIcon("rowing", [
  ["path", { d: "M2 12c5-2.5 15-2.5 20 0-5 2.5-15 2.5-20 0z", key: "shell" }],
  ["path", { d: "M9 11.2 6 5.5", key: "oar-a" }],
  ["path", { d: "m4.45 6.32 3.1-1.64", key: "blade-a" }],
  ["path", { d: "m15 12.8 3 5.7", key: "oar-b" }],
  ["path", { d: "m16.45 19.32 3.1-1.64", key: "blade-b" }],
]);

/**
 * A carabiner, gate open.
 *
 * A closed rounded outline read as the digit zero, and breaking it read as a
 * letter — a symmetrical ring with a bite out of one side is a C or a G before
 * it is anything else. What fixes it is the straight spine. Real carabiners
 * are offset D's, flat down one long side and curved down the other, and that
 * asymmetry is what no letterform has: a shape with one ruled edge is read as
 * an object rather than as type. The notch and the inward gate then say which
 * object.
 *
 * Nine units wide to nineteen tall, and the ratio is deliberate: at eleven
 * wide the same drawing was a phone with a notch.
 */
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

/**
 * Someone sitting cross-legged.
 *
 * Three curved drafts came out a chess pawn: two arcs that meet at a point
 * stop being two limbs and become one outline, whatever the gap between them.
 * Straightening them fixed that and broke something else — the arms and the
 * legs were both chevrons, one pointing down and one pointing up, and two
 * chevrons nose to nose are a diamond. A ball on a diamond is a spinning top.
 *
 * The base is what fixes it, and it fixes it by being *wider than the arms*.
 * A seated person's outline does not close at the bottom: the shins cross and
 * carry on past the hands, so the widest thing in the drawing is the legs, not
 * the shoulders. Six units of leg stick out beyond where the hands stop, the
 * zigzag replaces the V, and there is no longer an outline to close. The only
 * convex shape left in the icon is the head.
 *
 * Lotus rather than a standing pose, because Lucide's `person-standing`
 * already covers the second and the two would be told apart only by their
 * arms. The zigzag is deliberately shallow — three units of rise across
 * seventeen of run. Deeper drew feet, and feet are the first thing to fill in
 * at 17px.
 */
export const Lotus = createLucideIcon("lotus", [
  ["circle", { cx: "12", cy: "4.5", r: "2.2", key: "head" }],
  ["path", { d: "M12 8.2 6.5 14.8", key: "arm-a" }],
  ["path", { d: "M12 8.2 17.5 14.8", key: "arm-b" }],
  ["path", { d: "m3.5 16.2 4.3 3.3 4.2-2.6 4.2 2.6 4.3-3.3", key: "legs" }],
]);
