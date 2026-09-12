// Three value imports, all relative and all with the extension, into modules
// that themselves import nothing — the rule `lib/analytics.ts` states: what
// bites is depth, not count. This module is loaded by `lib/demo.test.ts` under
// `node --test`, where `@/` resolves to nothing because that alias belongs to
// the bundler. The type imports below are erased before Node ever looks at a
// path, so they keep the alias.
import { addDays, daysBetween } from "./daymath.ts";
import { MOODS } from "./moods.ts";
import type { DayString } from "@/lib/dates";
import type { LibraryGroup } from "@/lib/queries/activities";
import type {
  ActivitySticker,
  DayStickers,
  StickersByDay,
} from "@/lib/stickers";

/**
 * A year of somebody's habits, invented on the spot, so a stranger can see
 * what the app looks like full.
 *
 * The signed-out landing page can say what Baby Steps is for, and it does. It
 * cannot show the thing the app is actually about, which is the picture a year
 * of stickers makes — the star, the strip, the mood line. Those need a year of
 * data, and a visitor who has not signed in does not have one. So this file
 * makes one.
 *
 * **Why it is generated and not seeded.** A row in the database is written on
 * a date and stays written. Six months later the demo's "last eight weeks" is
 * eight weeks of nothing and its mood line stops halfway across the chart —
 * the demo would rot, silently, and the only person who would notice is a
 * visitor. Generating from today means there is no such thing as stale: the
 * window ends on whatever day you happen to arrive.
 *
 * **It is the same library the seed script installs**, mark for mark. That is
 * the point of a demo — the six life areas and the thirteen starter habits are
 * what you get when you sign in, so the demo is a picture of the app you would
 * actually have, not a showreel with invented content in it.
 *
 * Nothing here touches Supabase, `next/headers`, or a clock. `today` arrives as
 * an argument, everything else is arithmetic, and that is what lets the whole
 * of it be tested under `node --test`.
 */

/**
 * How much history the demo has: the last 365 days, ending today.
 *
 * "Year to date" was the brief, and read literally — 1 January to today — it
 * gives a demo that is three days long every 3rd of January and empties itself
 * every New Year's Eve. Rolling is the reading that survives the calendar: it
 * is always a full year, it always ends today, and on any given day the
 * difference between the two is invisible to a visitor who has never seen the
 * other one.
 */
export const DEMO_DAYS = 365;

/** Roughly how many stickers land on an average day. See `scale` below. */
export const DEMO_PER_DAY = 4;

/** Share of days carrying a mood. Not all of them — the gaps are real too. */
const MOOD_SHARE = 0.85;

/**
 * A habit, plus the three numbers that decide when it happens.
 *
 * `base` is roughly the share of days it lands on, before the other two bend
 * it. `days` is a weekday bias — the weekdays it belongs to, Sunday being 0 —
 * and it is the single most load-bearing field here: the habit strip draws
 * whole weeks, one column per weekday, so a habit that only happens at
 * weekends reads as a vertical stripe and a habit that happens whenever reads
 * as static. Without the bias every row of the strip is the same grey noise.
 *
 * `fade` is the year-long drift, negative for a habit that tailed off and
 * positive for one that took hold. It is what gives the demo a *story* — Yoga
 * stopping in the spring, Drawing arriving in the autumn — and it is the only
 * reason the Trends page has anything to say. A year in which every habit
 * happened at a constant rate is a year with no trends in it.
 */
type DemoHabit = {
  slug: string;
  area: string;
  name: string;
  mark: string;
  base: number;
  /** Weekdays it leans towards, Sunday 0. Omitted means no lean. */
  days?: number[];
  /** -1 faded out across the year, +1 grew into it, 0 steady. */
  fade: number;
};

/**
 * The six life areas, in the order `seed_life_areas` creates them, with the
 * same names, slugs and hues. If those two ever disagree the migration wins —
 * it is the one that makes real accounts.
 */
const AREAS: { slug: string; name: string; colorKey: string }[] = [
  { slug: "spirituality", name: "Spirituality", colorKey: "red" },
  { slug: "exercise", name: "Exercise", colorKey: "blue" },
  { slug: "work", name: "Work", colorKey: "orange" },
  { slug: "creativity", name: "Creativity & Play", colorKey: "yellow" },
  { slug: "romance", name: "Romance & Adventure", colorKey: "green" },
  { slug: "friends", name: "Friends & Family", colorKey: "purple" },
];

/**
 * The thirteen starter habits, matching `scripts/seed.sql` name for name and
 * icon for icon, with the demo's own three numbers hung off each.
 *
 * The `base` figures are not tuned to add up to anything. `scale` normalises
 * the lot to `DEMO_PER_DAY` at generation time, so these say only how habits
 * compare to *each other* — Deep work happens far more than Adventure — and
 * the density of the calendar is set in one place by one constant. Edit a
 * weight here and the average holds.
 *
 * They *are* tuned so the six areas come out within about three to one of each
 * other, which is the one place the demo is flattering rather than realistic.
 * A plausible year is mostly work: two work habits at their honest rate put
 * eight times as many marks on the board as Romance & Adventure, and the Life
 * Star that draws is one spike and five stumps — a picture of the chart being
 * broken rather than of a life. The demo's job is to show what the star looks
 * like when it has something to say.
 */
const HABITS: DemoHabit[] = [
  {
    slug: "meditation",
    area: "spirituality",
    name: "Meditation",
    mark: "icon:sparkles",
    base: 0.38,
    fade: 0.6,
  },
  {
    slug: "journaling",
    area: "spirituality",
    name: "Journaling",
    mark: "icon:notebook-pen",
    base: 0.26,
    fade: 0.3,
  },
  {
    slug: "gym",
    area: "exercise",
    name: "Gym",
    mark: "icon:dumbbell",
    base: 0.4,
    days: [1, 3, 5],
    fade: 0,
  },
  {
    slug: "run",
    area: "exercise",
    name: "Run",
    mark: "icon:footprints",
    base: 0.28,
    days: [0, 2, 6],
    fade: 0.4,
  },
  {
    slug: "yoga",
    area: "exercise",
    name: "Yoga",
    mark: "icon:person-standing",
    base: 0.24,
    fade: -1,
  },
  {
    slug: "deep-work",
    area: "work",
    name: "Deep work",
    mark: "icon:brain",
    base: 0.42,
    days: [1, 2, 3, 4, 5],
    fade: 0,
  },
  {
    slug: "inbox-zero",
    area: "work",
    name: "Inbox zero",
    mark: "icon:inbox",
    base: 0.24,
    days: [1, 2, 3, 4, 5],
    fade: -0.2,
  },
  {
    slug: "drawing",
    area: "creativity",
    name: "Drawing",
    mark: "icon:pen-tool",
    base: 0.32,
    fade: 0.5,
  },
  {
    slug: "piano",
    area: "creativity",
    name: "Piano",
    mark: "icon:piano",
    base: 0.28,
    fade: -0.4,
  },
  {
    slug: "date-night",
    area: "romance",
    name: "Date night",
    mark: "icon:heart",
    base: 0.34,
    days: [5, 6],
    fade: 0.2,
  },
  {
    slug: "adventure",
    area: "romance",
    name: "Adventure",
    mark: "icon:mountain",
    base: 0.26,
    days: [0, 6],
    fade: 0,
  },
  {
    slug: "called-home",
    area: "friends",
    name: "Called home",
    mark: "icon:phone-call",
    base: 0.3,
    days: [0],
    fade: 0,
  },
  {
    slug: "saw-friends",
    area: "friends",
    name: "Saw friends",
    mark: "icon:handshake",
    base: 0.38,
    days: [5, 6],
    fade: 0.3,
  },
];

/** How much a habit's own weekdays are favoured, and how much the rest lose. */
const ON_DAY = 1.6;
const OFF_DAY = 0.35;

/** No habit is ever certain, however heavily the weights land on it. */
const P_MAX = 0.95;

export const DEMO_AREA_COUNT = AREAS.length;
export const DEMO_HABIT_COUNT = HABITS.length;

/**
 * The library, in the shape `getStickerLibrary` returns.
 *
 * Ids are strings the database would never mint — `demo-…` rather than a uuid
 * — which is deliberate and is the cheapest possible guard: if one of these
 * ever reached a Server Action it would be rejected by the foreign key rather
 * than matching somebody's row.
 */
export function demoLibrary(): LibraryGroup[] {
  return AREAS.map((area) => ({
    areaId: `demo-area-${area.slug}`,
    areaName: area.name,
    colorKey: area.colorKey,
    stickers: HABITS.filter((habit) => habit.area === area.slug).map(
      (habit) => ({
        id: `demo-${habit.slug}`,
        name: habit.name,
        mark: habit.mark,
        colorKey: area.colorKey,
        archived: false,
      }),
    ),
  }));
}

/**
 * A year of placements and moods ending on `end`, in the shape
 * `getStickersByDay` returns.
 *
 * **A pure function of one date.** Nothing in here reads a clock, and that is
 * not tidiness — the demo page renders on the server and then again in the
 * browser to hydrate, and a `Math.random()` or a `new Date()` anywhere below
 * would put two different years on the two sides of that seam. The date comes
 * in as an argument, the server generates the year once, and the browser is
 * handed the finished Map.
 *
 * The *shape* of the year is anchored to `end` rather than to the calendar:
 * "Yoga tailed off" means it tailed off by the time you arrived, whenever that
 * is. So a visitor who comes back next week gets the same story shifted along
 * by a week, not literally the same placements — which is the right trade,
 * because a story told relative to the visit is the only kind a rolling window
 * can tell. What is fixed to the calendar is the mood wave; see `moodOf`.
 */
export function demoStickers(end: DayString): StickersByDay {
  const start = addDays(end, -(DEMO_DAYS - 1));
  const factor = scale(start);

  const byDay: StickersByDay = new Map();

  for (let i = 0; i < DEMO_DAYS; i++) {
    const day = addDays(start, i);
    const t = i / (DEMO_DAYS - 1);

    const activities: ActivitySticker[] = [];
    for (const habit of HABITS) {
      // One draw per habit per day, each from its own stream — `habit.slug` is
      // in the seed — so adding a habit to the list above does not reshuffle
      // the year for the twelve that were already there.
      if (random(day, habit.slug) >= chance(habit, day, t, factor)) continue;

      const area = AREAS.find((candidate) => candidate.slug === habit.area)!;
      activities.push({
        id: `demo-${day}-${habit.slug}`,
        activityId: `demo-${habit.slug}`,
        name: habit.name,
        mark: habit.mark,
        colorKey: area.colorKey,
      });
    }

    const day_: DayStickers = {
      activities,
      mood: random(day, "mood?") < MOOD_SHARE ? moodOf(day) : null,
      note: null,
    };

    // Days with nothing at all are left out of the Map entirely, which is what
    // the real query does — `NO_STICKERS` is the answer for a day it has never
    // heard of, and a demo that filled in empty entries would be the one place
    // in the app where the Map's own rule didn't hold.
    if (activities.length > 0 || day_.mood) byDay.set(day, day_);
  }

  return byDay;
}

/**
 * The probability this habit lands on this day.
 *
 * Three multipliers on a base rate rather than a rule with branches in it,
 * because the three are independent questions — how often, which weekdays,
 * which end of the year — and multiplying is what lets each be edited without
 * reasoning about the other two.
 */
function chance(
  habit: DemoHabit,
  day: DayString,
  t: number,
  factor: number,
): number {
  return Math.min(
    P_MAX,
    habit.base * weekday(habit, day) * drift(habit, t) * factor,
  );
}

function weekday(habit: DemoHabit, day: DayString): number {
  if (!habit.days) return 1;
  return habit.days.includes(dayOfWeek(day)) ? ON_DAY : OFF_DAY;
}

/**
 * How much a habit swings across the year, end to end. 1.5 means a full `fade`
 * of 1 runs from a quarter of its base rate to one and three quarters — enough
 * that a habit which stopped reads as *stopped* in the strip, rather than as a
 * slightly thinner scatter that you would have to count to notice.
 */
const DRIFT_SWING = 1.5;

/**
 * The year-long ramp, centred so a habit's *average* rate over the window is
 * its base rate whichever way it drifts. `fade` of 1 runs from 0.25× at the
 * start to 1.75× at the end; -1 runs the other way; 0 is flat.
 *
 * Floored at zero, because a `fade` outside [-1, 1] would otherwise ask for a
 * negative probability and the draw below would quietly read it as "never".
 * Saying so here is cheaper than a range check on the table.
 */
function drift(habit: DemoHabit, t: number): number {
  return Math.max(0, 1 + habit.fade * (t - 0.5) * DRIFT_SWING);
}

/**
 * The one number that turns thirteen relative weights into "about four a day".
 *
 * Computed by walking the window once and summing every probability, which is
 * the expected number of placements — then dividing the target by it. A closed
 * form would be shorter and would have to be rederived every time a weight,
 * a weekday bias or the drift curve changed; this cannot fall out of date
 * because it is measuring the same function that draws the stickers.
 *
 * The clamp in `chance` is applied after this, so the true average lands a
 * shade under the target once a heavy habit starts hitting the ceiling. Under,
 * not over, which is the harmless direction.
 */
function scale(start: DayString): number {
  let expected = 0;
  for (let i = 0; i < DEMO_DAYS; i++) {
    const day = addDays(start, i);
    const t = i / (DEMO_DAYS - 1);
    for (const habit of HABITS) {
      expected += habit.base * weekday(habit, day) * drift(habit, t);
    }
  }
  return (DEMO_PER_DAY * DEMO_DAYS) / expected;
}

/**
 * The day's mood, as a wave rather than a coin toss.
 *
 * Two slow sinusoids and a little jitter. The Moods tab draws a line, and a
 * line through independent random draws is a hairball that says nothing — what
 * makes it worth looking at is that a mood in March has something to do with
 * the mood in February. The periods are 97 and 23 days, deliberately coprime
 * and neither of them a month, so the shape never lines up with the calendar
 * and never repeats inside one window.
 *
 * The phase comes from the day's absolute distance from a fixed epoch, not
 * from its position in the window, so the wave is nailed to the calendar and
 * yesterday's mood is the same tomorrow.
 */
const EPOCH = "2000-01-01" as DayString;
const SLOW = 97;
const FAST = 23;
const JITTER = 0.8;

function moodOf(day: DayString) {
  const n = daysBetween(EPOCH, day);
  const wave =
    3 +
    1.15 * Math.sin((2 * Math.PI * n) / SLOW + 1.3) +
    0.7 * Math.sin((2 * Math.PI * n) / FAST + 0.4) +
    (random(day, "mood") - 0.5) * 2 * JITTER;

  // MOODS runs best to worst and the wave runs worst to best, so 5 is index 0.
  const score = Math.min(5, Math.max(1, Math.round(wave)));
  return MOODS[MOODS.length - score];
}

/** Sunday 0, matching `Date.prototype.getUTCDay` and the strip's columns. */
function dayOfWeek(day: DayString): number {
  // 1970-01-01 was a Thursday, which is 4.
  return (((daysBetween("1970-01-01" as DayString, day) + 4) % 7) + 7) % 7;
}

/**
 * A number in [0, 1) from a day and a label, and the same one every time.
 *
 * `Math.random()` is not an option: the page renders on the server and again in
 * the browser to hydrate, and two different years is a hydration mismatch and a
 * calendar that visibly changes under you. So the seed is the text — the date
 * plus what the draw is *for* — hashed with FNV-1a and run through mulberry32.
 * Cheap, no dependency, and well enough distributed for stickers.
 */
function random(day: DayString, label: string): number {
  let h = 0x811c9dc5;
  const text = `${day}:${label}`;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }

  let a = h >>> 0;
  a = (a + 0x6d2b79f5) | 0;
  let out = Math.imul(a ^ (a >>> 15), 1 | a);
  out = (out + Math.imul(out ^ (out >>> 7), 61 | out)) ^ out;
  return ((out ^ (out >>> 14)) >>> 0) / 4294967296;
}
