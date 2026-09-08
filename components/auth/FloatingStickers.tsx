import { PointerNudge } from "@/components/auth/PointerNudge";
import { StickerMark } from "@/components/calendar/StickerMark";

/**
 * Where the stickers go: a percentage of the screen, both axes, and nothing
 * else.
 *
 * This replaced a scheme that measured off the text column — rows at
 * `bottom: calc(100% + 24px)`, so the gap to the title was an exact 24px on any
 * screen. Two percentages are less clever and easier to reason about, and the
 * cost is only that the gap is now whatever the percentages work out to; the
 * bands below are chosen to keep it comfortable across window sizes rather
 * than exact on any one of them.
 *
 * Worth being clear about what that change did *not* fix, because the comment
 * that used to sit here claimed otherwise. The stickers had a habit of landing
 * and then twitching a second time a beat later, and the column-anchored
 * layout looked like an obvious suspect — a webfont arriving after first paint
 * changes the text's height, and anything hanging off it moves. Plausible, and
 * wrong. The real cause was a positive `animation-delay` on the drift: see the
 * note on `--animate-drift` in globals.css. Moving to viewport percentages was
 * worth doing on its own merits and made no difference to the twitch.
 */

/**
 * Seven bands down the screen, and the middle one is the only one with a rule
 * attached: it's level with the words, so it holds the two edge columns only.
 *
 * `top-[4%]` and `bottom-[4%]` rather than a single set of top percentages,
 * because measuring each half from its own edge keeps them symmetric without
 * anybody having to work out what 96% minus a sticker is.
 *
 * The `min-height` gate on the third band is arithmetic, not taste. The text
 * block is around 380px tall and vertically centred, so on an 800px window it
 * occupies 26% to 74% and a band at 25% is touching it. At 1000px it occupies
 * 31% to 69% and there's room. Under that height the screen gets five bands
 * instead of seven, which is the right answer — there isn't space for seven.
 */
const BAND = {
  top1: "top-[4%]",
  top2: "top-[14%]",
  top3: "top-[25%] hidden [@media(min-height:1000px)]:block",
  /**
   * Level with the title. `lg:` gated because this is the one band that can
   * collide with the text: the column is 448px wide, so at 1024px a sticker
   * centred on 5% sits 217px clear of it, and at 640px it doesn't.
   */
  middle: "top-[46%] hidden lg:block",
  bottom3: "bottom-[25%] hidden [@media(min-height:1000px)]:block",
  bottom2: "bottom-[14%]",
  bottom1: "bottom-[4%]",
} as const;

/**
 * Columns, as a percentage of the window width.
 *
 * `-ml-5` is what makes "evenly spaced" true rather than nearly true. An
 * absolutely positioned element is placed by its *left edge*, so `left-[95%]`
 * would sit a whole sticker closer to the right edge than `left-[5%]` sits to
 * the left one. Half a sticker of negative margin turns each percentage into a
 * centre line, and the row becomes symmetric.
 *
 * Bands use every fourth value (20% apart) and consecutive bands start on
 * opposite feet — one on …5, 25, 45…, the next on …15, 35, 55… — which is what
 * turns a grid into a scatter without any of the positions being arbitrary.
 */
const X = {
  "5": "-ml-5 left-[5%]",
  "10": "-ml-5 left-[10%]",
  "15": "-ml-5 left-[15%]",
  "20": "-ml-5 left-[20%]",
  "25": "-ml-5 left-[25%]",
  "35": "-ml-5 left-[35%]",
  "45": "-ml-5 left-[45%]",
  "50": "-ml-5 left-1/2",
  "55": "-ml-5 left-[55%]",
  "60": "-ml-5 left-[60%]",
  "65": "-ml-5 left-[65%]",
  "75": "-ml-5 left-[75%]",
  "80": "-ml-5 left-[80%]",
  "85": "-ml-5 left-[85%]",
  "90": "-ml-5 left-[90%]",
  "95": "-ml-5 left-[95%]",
} as const;

/**
 * One decorative sticker: what it is, where it sits, how big, and when it
 * arrives.
 *
 * Every Tailwind class here is written out in full, and it has to be. Tailwind
 * finds classes by scanning source *text*, so `top-[${top}%]` would compile to
 * nothing — the same trap `lib/palette.ts` documents and the reason `RAMP` is a
 * literal map rather than a template string. The constants above are fine
 * because the class name still appears literally in this file; it's assembling
 * one out of pieces at runtime that fails.
 */
type Floater = {
  name: string;
  mark: string;
  colorKey: string;
  /** One `BAND` and one `X`. */
  position: string;
  /**
   * How big, passed straight to `StickerMark`. Size and type scale only.
   *
   * It also sets how far the sticker falls — see `DROP`. It used to set when
   * the sticker arrived as well; it doesn't any more, because size and
   * position turned out to correlate in this layout and sorting by one meant
   * clustering by the other. `ORDER` decides arrival now.
   */
  size: string;
  /** Its own drift clock — see `--animate-drift` in globals.css. */
  drift: string;
  /** Its own horizontal clock — see `--animate-drift-x` in globals.css. */
  driftX: string;
  /**
   * **The knob.** Nudge one sticker off its band without disturbing anything
   * else — `ml-[9px] mt-[-14px]` and so on. Leave it off and the sticker sits
   * exactly on the grid.
   *
   * This is what makes the placement look accidental. Bands and columns are
   * what stop the field from clumping, but a field that obeys them exactly
   * reads as a pattern the moment you notice it. Ten to fifteen pixels is
   * enough to break the alignment while keeping the even coverage the bands
   * were for.
   *
   * It's `margin` rather than `translate` because all three of the nested
   * spans are already spending their one `translate` on something — the
   * entrance, the cursor, the drift. Margin is the property nothing else in
   * here wants. The cost is that it inflates the box `PointerNudge` measures,
   * so the cursor push is centred half an offset away from the sticker; at ten
   * pixels of a 240px radius that is not a difference anyone can see.
   *
   * Keep it under about 20px. Past that the sticker starts landing in the next
   * band's lane and the coverage goes lumpy — which is the thing the grid is
   * there to prevent. Pixels, not percentages, on purpose: this one is a
   * scribble on top of the layout, and it should stay the same size everywhere
   * rather than growing with the window.
   */
  offset?: string;
  /**
   * **The other knob.** A static tilt, `rotate-3` / `-rotate-6`, on top of the
   * drift's own ±5°. Nothing else uses `rotate` on this span, and the drift
   * rotates the child, so the two compose instead of fighting.
   *
   * A sticker that is visibly off-square reads as dropped rather than placed,
   * and it does more for "haphazard" per character than the offset does. Six
   * degrees is a lot; three is usually plenty.
   */
  tilt?: string;
};

/**
 * Twenty-six of them, on seven bands, with the middle band left empty across
 * the width where the words are.
 *
 * Two visibility tiers, each one earned:
 *
 * - **`[@media(min-height:1000px)]`** — the third band up and down. On a short
 *   window it would be on top of the tagline.
 * - **`hidden lg:block`** — the pair level with the title, which needs the
 *   window to be wider than the text column plus two stickers.
 *
 * Everything else shows at every size, because a percentage of the screen is
 * always somewhere on the screen — which is the point of the rewrite.
 *
 * The marks and colours are the six life areas the app seeds, not a random
 * assortment: this is a preview of what the thing behind the login actually
 * looks like, so a sticker here should be one you could plausibly make. The
 * `name` is the real accessible name `StickerMark` renders — invisible here
 * because the whole layer is `aria-hidden`, but it costs nothing to say what
 * each one is, and it means these are ordinary stickers rather than a special
 * shape that happens to look like one.
 *
 * Array order is *not* arrival order — `ORDER` below is. The order here is
 * spatial, grouped by band, because that's the order you want when you're
 * moving something; the order you want when you're *watching* is almost the
 * opposite, which is why the two are separate lists.
 */
const FLOATERS: Floater[] = [
  // Level with the title.
  {
    name: "Wind down",
    mark: "🌙",
    colorKey: "purple",
    position: `${BAND.middle} ${X["5"]}`,
    size: "size-11 text-xl",
    drift: "[--drift-dur:7.8s] [--drift-delay:-2.1s]",
    driftX: "[--drift-x-dur:10.7s] [--drift-x-delay:-0.4s]",
    offset: "mt-[-14px]",
  },
  {
    name: "Take a photo",
    mark: "📷",
    colorKey: "orange",
    position: `${BAND.middle} ${X["95"]}`,
    size: "size-11 text-xl",
    drift: "[--drift-dur:9.2s] [--drift-delay:-2.7s]",
    driftX: "[--drift-x-dur:12.6s] [--drift-x-delay:-2.3s]",
    offset: "mt-[16px]",
    tilt: "rotate-6",
  },
  // The bands closest to the text, on tall windows.
  {
    name: "Eat an apple",
    mark: "🍎",
    colorKey: "red",
    position: `${BAND.top3} ${X["10"]}`,
    size: "size-10 text-lg",
    drift: "[--drift-dur:6.7s] [--drift-delay:-1.2s]",
    driftX: "[--drift-x-dur:9.2s] [--drift-x-delay:-4.2s]",
    offset: "ml-[11px] mt-[-9px]",
    tilt: "-rotate-6",
  },
  {
    name: "Drink water",
    mark: "💧",
    colorKey: "blue",
    position: `${BAND.top3} ${X["50"]}`,
    size: "size-10 text-lg",
    drift: "[--drift-dur:6.9s] [--drift-delay:-1.6s]",
    driftX: "[--drift-x-dur:9.5s] [--drift-x-delay:-6.1s]",
    offset: "ml-[9px] mt-[14px]",
    tilt: "-rotate-2",
  },
  {
    name: "Sweep up",
    mark: "🧹",
    colorKey: "blue",
    position: `${BAND.top3} ${X["90"]}`,
    size: "size-10 text-lg",
    drift: "[--drift-dur:6.4s] [--drift-delay:-0.8s]",
    driftX: "[--drift-x-dur:8.8s] [--drift-x-delay:-8s]",
    offset: "ml-[13px] mt-[-9px]",
  },
  {
    name: "Rest day",
    mark: "🛌",
    colorKey: "red",
    position: `${BAND.bottom3} ${X["20"]}`,
    size: "size-10 text-lg",
    drift: "[--drift-dur:8.4s] [--drift-delay:-2.9s]",
    driftX: "[--drift-x-dur:11.5s] [--drift-x-delay:-9.9s]",
    offset: "ml-[-7px] mt-[-12px]",
    tilt: "rotate-6",
  },
  {
    name: "Eat something green",
    mark: "🥗",
    colorKey: "green",
    position: `${BAND.bottom3} ${X["60"]}`,
    size: "size-10 text-lg",
    drift: "[--drift-dur:7.1s] [--drift-delay:-1.9s]",
    driftX: "[--drift-x-dur:9.7s] [--drift-x-delay:-3s]",
    offset: "ml-[-9px] mt-[7px]",
    tilt: "-rotate-6",
  },
  {
    name: "Practice",
    mark: "🎸",
    colorKey: "purple",
    position: `${BAND.bottom3} ${X["80"]}`,
    size: "size-11 text-xl",
    drift: "[--drift-dur:7.2s] [--drift-delay:-1.1s]",
    driftX: "[--drift-x-dur:9.9s] [--drift-x-delay:-4.7s]",
    offset: "ml-[-15px] mt-[-10px]",
    tilt: "rotate-3",
  },
  // Second band up and down.
  {
    name: "Walk",
    mark: "🥾",
    colorKey: "green",
    position: `${BAND.top2} ${X["15"]}`,
    size: "size-10 text-lg",
    drift: "[--drift-dur:8.2s] [--drift-delay:-0.7s]",
    driftX: "[--drift-x-dur:11.2s] [--drift-x-delay:-5.3s]",
    offset: "ml-[-8px] mt-[15px]",
    tilt: "rotate-2",
  },
  {
    name: "Listen to a record",
    mark: "🎧",
    colorKey: "blue",
    position: `${BAND.top2} ${X["35"]}`,
    size: "size-10 text-lg",
    drift: "[--drift-dur:6.8s] [--drift-delay:-0.9s]",
    driftX: "[--drift-x-dur:9.3s] [--drift-x-delay:-0.7s]",
    offset: "ml-[6px] mt-[11px]",
  },
  {
    name: "Make tea",
    mark: "🍵",
    colorKey: "orange",
    position: `${BAND.top2} ${X["55"]}`,
    size: "size-10 text-lg",
    drift: "[--drift-dur:7.7s] [--drift-delay:-1.3s]",
    driftX: "[--drift-x-dur:10.5s] [--drift-x-delay:-9.8s]",
    offset: "ml-[15px] mt-[9px]",
  },
  {
    name: "Watch something",
    mark: "🎬",
    colorKey: "purple",
    position: `${BAND.top2} ${X["75"]}`,
    size: "size-11 text-xl",
    drift: "[--drift-dur:8.9s] [--drift-delay:-2.3s]",
    driftX: "[--drift-x-dur:12.2s] [--drift-x-delay:-10s]",
    offset: "ml-[-12px] mt-[8px]",
    tilt: "-rotate-3",
  },
  {
    name: "Tidy up",
    mark: "🧺",
    colorKey: "blue",
    position: `${BAND.bottom2} ${X["15"]}`,
    size: "size-10 text-lg",
    drift: "[--drift-dur:6.6s] [--drift-delay:-2.2s]",
    driftX: "[--drift-x-dur:9s] [--drift-x-delay:-7s]",
    offset: "ml-[10px] mt-[-16px]",
    tilt: "rotate-2",
  },
  {
    name: "Ride",
    mark: "🚲",
    colorKey: "red",
    position: `${BAND.bottom2} ${X["35"]}`,
    size: "size-10 text-lg",
    drift: "[--drift-dur:6.2s] [--drift-delay:-1.7s]",
    driftX: "[--drift-x-dur:8.5s] [--drift-x-delay:-2.3s]",
    offset: "ml-[8px] mt-[-15px]",
    tilt: "-rotate-2",
  },
  {
    name: "Run",
    mark: "🏃",
    colorKey: "red",
    position: `${BAND.bottom2} ${X["55"]}`,
    size: "size-14 text-2xl",
    drift: "[--drift-dur:7s] [--drift-delay:0s]",
    driftX: "[--drift-x-dur:9.6s] [--drift-x-delay:-0.9s]",
    offset: "ml-[-9px] mt-[-11px]",
    tilt: "rotate-3",
  },
  {
    name: "Cook a real meal",
    mark: "🍳",
    colorKey: "orange",
    position: `${BAND.bottom2} ${X["75"]}`,
    size: "size-12 text-xl",
    drift: "[--drift-dur:8.8s] [--drift-delay:-0.4s]",
    driftX: "[--drift-x-dur:12.1s] [--drift-x-delay:-6.5s]",
    offset: "ml-[7px] mt-[12px]",
    tilt: "-rotate-2",
  },
  // The two ends of the screen.
  {
    name: "Sit outside",
    mark: "☀️",
    colorKey: "yellow",
    position: `${BAND.top1} ${X["5"]}`,
    size: "size-11 text-xl",
    drift: "[--drift-dur:9.8s] [--drift-delay:-1.4s]",
    driftX: "[--drift-x-dur:13.4s] [--drift-x-delay:-5.8s]",
    offset: "ml-[-11px] mt-[10px]",
    tilt: "-rotate-3",
  },
  {
    name: "Early night",
    mark: "💤",
    colorKey: "yellow",
    position: `${BAND.top1} ${X["25"]}`,
    size: "size-10 text-lg",
    drift: "[--drift-dur:8s] [--drift-delay:-2.4s]",
    driftX: "[--drift-x-dur:11s] [--drift-x-delay:-2.4s]",
    offset: "ml-[12px] mt-[18px]",
    tilt: "rotate-6",
  },
  {
    name: "Stretch",
    mark: "🧘",
    colorKey: "purple",
    position: `${BAND.top1} ${X["45"]}`,
    size: "size-11 text-xl",
    drift: "[--drift-dur:7.4s] [--drift-delay:-0.5s]",
    driftX: "[--drift-x-dur:10.1s] [--drift-x-delay:-7s]",
    offset: "ml-[-14px] mt-[-8px]",
  },
  {
    name: "Call home",
    mark: "📞",
    colorKey: "yellow",
    position: `${BAND.top1} ${X["65"]}`,
    size: "size-10 text-lg",
    drift: "[--drift-dur:8.6s] [--drift-delay:-2.5s]",
    driftX: "[--drift-x-dur:11.8s] [--drift-x-delay:-3.8s]",
    offset: "ml-[-6px] mt-[13px]",
    tilt: "-rotate-3",
  },
  {
    name: "Bake",
    mark: "🍞",
    colorKey: "orange",
    position: `${BAND.top1} ${X["85"]}`,
    size: "size-11 text-xl",
    drift: "[--drift-dur:7.6s] [--drift-delay:-0.2s]",
    driftX: "[--drift-x-dur:10.4s] [--drift-x-delay:-0.4s]",
    offset: "ml-[14px] mt-[-13px]",
    tilt: "-rotate-6",
  },
  {
    name: "Write it down",
    mark: "✎",
    colorKey: "green",
    position: `${BAND.bottom1} ${X["5"]}`,
    size: "size-10 text-lg",
    drift: "[--drift-dur:9.5s] [--drift-delay:-1.5s]",
    driftX: "[--drift-x-dur:13s] [--drift-x-delay:-4s]",
    offset: "ml-[11px] mt-[-9px]",
    tilt: "-rotate-6",
  },
  {
    name: "Read",
    mark: "📚",
    colorKey: "blue",
    position: `${BAND.bottom1} ${X["25"]}`,
    size: "size-12 text-xl",
    drift: "[--drift-dur:8.5s] [--drift-delay:-0.6s]",
    driftX: "[--drift-x-dur:11.6s] [--drift-x-delay:-10.1s]",
    offset: "ml-[-7px] mt-[14px]",
    tilt: "rotate-3",
  },
  {
    name: "Coffee with a friend",
    mark: "☕",
    colorKey: "orange",
    position: `${BAND.bottom1} ${X["45"]}`,
    size: "size-10 text-lg",
    drift: "[--drift-dur:7.5s] [--drift-delay:-1.8s]",
    driftX: "[--drift-x-dur:10.3s] [--drift-x-delay:-6.5s]",
    offset: "ml-[16px] mt-[-12px]",
  },
  {
    name: "Make something",
    mark: "🎨",
    colorKey: "purple",
    position: `${BAND.bottom1} ${X["65"]}`,
    size: "size-12 text-xl",
    drift: "[--drift-dur:6.5s] [--drift-delay:-1.2s]",
    driftX: "[--drift-x-dur:8.9s] [--drift-x-delay:-6s]",
    offset: "ml-[-13px] mt-[10px]",
    tilt: "-rotate-3",
  },
  {
    name: "Water the plants",
    mark: "🌱",
    colorKey: "green",
    position: `${BAND.bottom1} ${X["85"]}`,
    size: "size-14 text-2xl",
    drift: "[--drift-dur:9s] [--drift-delay:-0.3s]",
    driftX: "[--drift-x-dur:12.3s] [--drift-x-delay:-2.3s]",
    offset: "ml-[6px] mt-[-6px]",
    tilt: "rotate-6",
  },
];

/**
 * The twenty-six arrival slots, 420ms to 2304ms. Add `--dur-fall` and the last
 * sticker is on screen at 2924ms.
 *
 * The first one starts at 420ms because that is exactly when the text finishes
 * rising — `--dur-hero`, with no delay on any of the three elements. The page
 * arrives in two beats and this array is the second; see `app/login/page.tsx`.
 * That offset is the only thing here you can change freely, because adding a
 * constant to every delay preserves every gap between stickers and therefore
 * preserves everything `ORDER` guarantees. Rescaling does not.
 *
 * **The number that matters is the smallest gap: 62ms.** Two events closer
 * together than roughly 60ms are not perceived as two events — they group, and
 * what you see is a clump arriving rather than one thing after another. That
 * floor is the one hard constraint in this array; everything else here is
 * shape.
 *
 * This used to end on fourteen stickers 20ms apart, on the theory that small
 * things can arrive in a flurry because you perceive them as a group anyway.
 * That was true and it was the problem: over half the field landed inside a
 * quarter of a second.
 *
 * **The gaps narrow as it goes** — about 84ms at the start, about 66ms at the
 * end. They used to be graded by size, on the theory that a big sticker earns
 * more air; they aren't any more, because arrival order stopped following size
 * (see `ORDER`). The ramp survives on its own terms: the first thing to land on
 * an empty screen gets looked at whatever size it is, and by the twentieth
 * you're watching a field fill in rather than watching each one.
 *
 * **The gaps are also deliberately uneven**, each a few milliseconds off the
 * ramp. Twenty-six evenly spaced arrivals read as a sequence playing back; the
 * same twenty-six with the intervals slightly ragged read as things falling. It
 * costs nothing — this is a literal array either way — and it is most of what
 * separates a cascade from a metronome.
 *
 * The whole thing takes about 2.9 seconds, which is a long time and is allowed
 * to be: the text is readable and clickable from the first frame and the layer
 * is `pointer-events-none`, so none of this is ever in anyone's way.
 *
 * **Retuning it means regenerating `ORDER` too.** That list is optimised
 * against these exact numbers — it guarantees a minimum time gap between
 * stickers that share a band or sit near each other, and those guarantees are
 * in milliseconds, not in slots. Shift the delays and they quietly weaken.
 * Scale the whole ramp rather than flattening it; the narrowing is the shape,
 * and 60ms is the floor.
 *
 * Written out rather than generated because Tailwind scans source text:
 * `[animation-delay:${n}ms]` built in a loop compiles to nothing, and all
 * twenty-six would land at once with no error anywhere to say why. Arbitrary
 * properties rather than `delay-*` utilities for the reason
 * `app/login/page.tsx` gives — in v4 those set `transition-delay`, and this is
 * an animation.
 *
 * This array is positional: slot *n* belongs to the *n*th name in `ORDER`, and
 * nothing else has to line up with it. Add a sticker and you add an entry to
 * both.
 */
const ENTER = [
  "[animation-delay:420ms]",
  "[animation-delay:504ms]",
  "[animation-delay:582ms]",
  "[animation-delay:668ms]",
  "[animation-delay:747ms]",
  "[animation-delay:834ms]",
  "[animation-delay:910ms]",
  "[animation-delay:992ms]",
  "[animation-delay:1076ms]",
  "[animation-delay:1148ms]",
  "[animation-delay:1228ms]",
  "[animation-delay:1302ms]",
  "[animation-delay:1383ms]",
  "[animation-delay:1454ms]",
  "[animation-delay:1529ms]",
  "[animation-delay:1607ms]",
  "[animation-delay:1675ms]",
  "[animation-delay:1750ms]",
  "[animation-delay:1819ms]",
  "[animation-delay:1895ms]",
  "[animation-delay:1962ms]",
  "[animation-delay:2033ms]",
  "[animation-delay:2105ms]",
  "[animation-delay:2167ms]",
  "[animation-delay:2235ms]",
  "[animation-delay:2304ms]",
];
/** Biggest first. Anything not on this list arrives with the smallest. */
/**
 * How far each sticker falls, by size — see `fall` in globals.css.
 *
 * A bigger thing displaces more when it lands, so it gets further to fall and a
 * proportionally deeper plunge. The keyframe reads this as `--fall-drop` and
 * derives its whole bounce from it, so these four numbers are the only knob.
 *
 * Written out in full for the reason every other class in this file is:
 * Tailwind scans source text, so `[--fall-drop:${n}px]` assembled at runtime
 * compiles to nothing and every sticker would silently fall the keyframe's
 * default 28px instead.
 */
const DROP: Record<string, string> = {
  "size-14": "[--fall-drop:34px]",
  "size-12": "[--fall-drop:31px]",
  "size-11": "[--fall-drop:29px]",
  "size-10": "[--fall-drop:26px]",
};

/**
 * Arrival order: which sticker takes which slot in `ENTER`.
 *
 * **Two stickers that read as related must not land at the same time**, and
 * "related" here means one of two things:
 *
 * - **Same band.** A row is a group however wide it is. Two stickers on
 *   `top-[14%]` land as a pair even at opposite ends of the window, because
 *   the eye has already grouped them by the time the second one arrives.
 * - **Close together anywhere.** Within about a quarter of the screen,
 *   measured with the two axes weighted *equally* — see below.
 *
 * No pair in either category lands within 273ms of another. The order before
 * this one managed 60ms, and that was the whole complaint: the top band
 * arriving as a clump at the end.
 *
 * This list is the output of an annealed search over all twenty-six slots
 * against those two rules, with size as a soft third term. It is not a rule you
 * can apply by hand and it is not worth trying — reorder it by eye and you will
 * reintroduce a pair, because the failures are invisible until they animate.
 * Regenerate it if the positions change.
 *
 * **Three orderings failed before this one, each for a different reason, and
 * they're worth knowing because two of them looked fine on paper.**
 *
 * Band by band read as rows sweeping down the screen: the eye caught the
 * *pattern* rather than the stickers.
 *
 * Sorting by size looked like the fix and wasn't. Size and position correlate
 * here — both size-14s and two of the three size-12s live in the bottom two
 * bands — so a size sort still walked the screen in patches, and a *stable*
 * one walked it in the original array's band order within each size. It just
 * took longer to notice.
 *
 * Then a greedy walk that took the furthest sticker at each step. That fixed
 * consecutive pairs and nothing else: greedy spends the well-separated
 * stickers early and leaves the leftovers, which are neighbours, for the tail.
 * It scored well on the metric it was built around — distance between
 * *consecutive* arrivals — and produced a visible clump anyway, because a
 * cluster is spread over four or five slots, not two. Measuring consecutive
 * pairs cannot see it. Measure every pair that lands within about 400ms of
 * another, or you are measuring the wrong thing.
 *
 * **The axes are weighted equally on purpose**, which is the other correction.
 * Weighting horizontal distance by the aspect ratio is right for "are these two
 * circles near each other" and wrong for this: it says two stickers at opposite
 * ends of one band are far apart, and they are not — they're a row. That
 * mistake is what left `Walk` and `Make tea` 66ms apart in an earlier attempt.
 *
 * Size hasn't vanished, it's demoted to a tiebreak: the first sticker down is
 * the biggest, the second size-14 is halfway in, and two of the three size-12s
 * are in the first eight. But the order is not big-to-small and can't be — the
 * constraint above and a strict size sort are not simultaneously satisfiable
 * with these positions, which was checked by holding the size sort as a hard
 * constraint and finding no valid ordering at all. Nobody watching can tell you
 * the running order of four sizes, and everybody can see two things land in the
 * same row at once.
 *
 * Names, not indices, so that reordering `FLOATERS` to move a sticker on the
 * page doesn't silently reshuffle the entrance. They have to match `name`
 * exactly; one that doesn't sorts to the end and gets the last slot rather
 * than disappearing.
 *
 * Bands drop out at small viewport sizes (see `BAND`), which takes their
 * stickers out of the sequence and widens the gaps around them. That only ever
 * thins the cascade, never clumps it, which is why the search runs on the full
 * set rather than per breakpoint.
 */
const ORDER = [
  "Run",
  "Make tea",
  "Eat an apple",
  "Read",
  "Practice",
  "Bake",
  "Listen to a record",
  "Make something",
  "Tidy up",
  "Take a photo",
  "Call home",
  "Walk",
  "Water the plants",
  "Ride",
  "Sweep up",
  "Stretch",
  "Wind down",
  "Eat something green",
  "Write it down",
  "Drink water",
  "Sit outside",
  "Cook a real meal",
  "Rest day",
  "Watch something",
  "Early night",
  "Coffee with a friend",
];/**
 * When each sticker arrives, keyed by name.
 *
 * Sorting a *copy*: `sort` mutates, and `FLOATERS` is rendered in its own
 * order. Reversing that quietly here would move every sticker on the page.
 */
const ARRIVAL = new Map(
  [...FLOATERS]
    .sort((a, b) => slot(a.name) - slot(b.name))
    // A twenty-seventh sticker, or one misspelled in `ORDER`, sorts to the end
    // and gets no delay rather than crashing: it arrives with the first group,
    // which is visible enough to notice and fix.
    .map((floater, index) => [floater.name, ENTER[index] ?? ""] as const),
);

function slot(name: string) {
  const found = ORDER.indexOf(name);
  return found === -1 ? ORDER.length : found;
}

/**
 * An unrecognised size falls the keyframe's own default rather than crashing,
 * which is how `ARRIVAL` handles a twenty-seventh sticker too.
 */
function drop(size: string) {
  const found = Object.keys(DROP).find((name) => size.startsWith(name));
  return found ? DROP[found] : "";
}

/**
 * Stickers scattered around the signed-out page.
 *
 * Decoration, and treated as such throughout: `aria-hidden` on the layer, so a
 * screen reader hears the two words and the sentence and nothing else, and
 * `pointer-events-none` so twenty-six circles can't intercept a click meant for
 * a sign-in button. Between them those two attributes are the difference
 * between atmosphere and an obstacle. `pointer-events-none` doesn't stop the
 * cursor *effect*, incidentally — `PointerNudge` listens on the window.
 *
 * `fixed inset-0`, so every percentage below is a percentage of the window.
 * That is the whole positioning model now, and it's what makes the layer
 * immune to the page reflowing under it when the webfonts land.
 * `overflow-hidden` guarantees a sticker near an edge can't widen the page.
 *
 * **Four nested spans, four animations, and that's the minimum.** An element
 * has one `animation` shorthand and one `translate`, and this needs four
 * different things to move it: the entrance drops it into place, the pointer
 * pushes it aside, and the drift — which is two animations, one per axis, for
 * the same reason — never stops. Stacked on one element the last one written
 * would win and the others would vanish without an error. Nesting is cheaper
 * than hand-writing a combined keyframe.
 *
 * The entrance is `animate-fall`, not the `animate-rise` the heading and the
 * paragraph use. A word rising into place reads as settling; a small round
 * object should drop, overshoot and rock back, which is what `fall` does and
 * what the calendar's own `land` does when a mark arrives on a Tuesday.
 *
 * The circle itself is `StickerMark` — the component the calendar, the tray and
 * the day modal all render. That's deliberate and it's the second attempt: this
 * file used to reimplement the circle from `ramp()`, which looked identical
 * right up until the day `StickerMark` changed from a filled circle to a ring
 * and this page kept the fill. Passing a size through a documented prop is the
 * price of only having one definition of what a sticker looks like.
 */
export function FloatingStickers() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <PointerNudge>
        {FLOATERS.map((floater) => (
          <span
            key={floater.name}
            className={`animate-fall absolute ${floater.position} ${drop(floater.size)} ${ARRIVAL.get(floater.name) ?? ""}`}
          >
            {/* The element the cursor moves. `duration-[900ms]` is doing most
                of the work of making it read as water: the script writes a
                destination and CSS takes the better part of a second drifting
                towards it.

                `linear` rather than `ease-out`, because the destination is
                rewritten every frame and a transition retargets from wherever
                it currently is. An ease-out restarts at full speed on every one
                of those retargets, so the sticker tracks the cursor far more
                eagerly than 900ms implies and the lag changes with how fast you
                are moving. Linear approaches at a constant rate, which is the
                same trail whatever the cursor does. */}
            <span
              data-nudge
              className={`block transition-[translate] duration-[900ms] ease-linear ${floater.tilt ?? ""}`}
            >
              <span
                className={`animate-drift block ${floater.drift} ${floater.offset ?? ""}`}
              >
                {/* The horizontal half of the drift, on its own element
                    because `translate` is one property and the span above is
                    already spending its. Nothing else lives here. */}
                <span className={`animate-drift-x block ${floater.driftX}`}>
                  <StickerMark
                    sticker={{
                      name: floater.name,
                      mark: floater.mark,
                      colorKey: floater.colorKey,
                    }}
                    className={floater.size}
                  />
                </span>
              </span>
            </span>
          </span>
        ))}
      </PointerNudge>
    </div>
  );
}
