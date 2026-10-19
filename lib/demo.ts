// Value imports relative with extension: `node --test` can't resolve `@/`.
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
 * A generated year of habits for the signed-out demo. Generated from today,
 * not seeded, so it never goes stale. Same library as the seed. Pure: no clock.
 */

/** Rolling 365 days ending today (not Jan 1 → today, which empties yearly). */
export const DEMO_DAYS = 365;

/** Target average per day. See `scale`. */
export const DEMO_PER_DAY = 4;

/** Share of days with a mood. */
const MOOD_SHARE = 0.85;

/**
 * `base`: rough daily share. `days`: weekday bias (shows as stripes in the
 * strip). `fade`: year-long drift, which gives Trends something to say.
 */
type DemoHabit = {
  slug: string;
  category: string;
  name: string;
  mark: string;
  base: number;
  /** Sunday 0. Omitted means no lean. */
  days?: number[];
  /** -1 faded out, +1 grew, 0 steady. */
  fade: number;
};

/** Mirrors `seed_life_areas`; the migration wins if they disagree. */
const CATEGORIES: { slug: string; name: string; colorKey: string }[] = [
  { slug: "spirituality", name: "Spirituality", colorKey: "oxblood" },
  { slug: "exercise", name: "Exercise", colorKey: "bottle" },
  { slug: "work", name: "Work", colorKey: "mustard" },
  { slug: "creativity", name: "Creativity & Play", colorKey: "rose" },
  { slug: "romance", name: "Romance & Adventure", colorKey: "sage" },
  { slug: "friends", name: "Friends & Family", colorKey: "plum" },
];

/**
 * Mirrors `scripts/seed.sql`. `base` is relative; `scale` normalises to
 * `DEMO_PER_DAY`. Tuned so categories stay within ~3:1, or the star is a spike.
 */
const HABITS: DemoHabit[] = [
  {
    slug: "meditation",
    category: "spirituality",
    name: "Meditation",
    mark: "icon:sparkles",
    base: 0.38,
    fade: 0.6,
  },
  {
    slug: "journaling",
    category: "spirituality",
    name: "Journaling",
    mark: "icon:notebook-pen",
    base: 0.26,
    fade: 0.3,
  },
  {
    slug: "gym",
    category: "exercise",
    name: "Gym",
    mark: "icon:dumbbell",
    base: 0.4,
    days: [1, 3, 5],
    fade: 0,
  },
  {
    slug: "run",
    category: "exercise",
    name: "Run",
    mark: "icon:footprints",
    base: 0.28,
    days: [0, 2, 6],
    fade: 0.4,
  },
  {
    slug: "yoga",
    category: "exercise",
    name: "Yoga",
    mark: "icon:person-standing",
    base: 0.24,
    fade: -1,
  },
  {
    slug: "deep-work",
    category: "work",
    name: "Deep work",
    mark: "icon:brain",
    base: 0.42,
    days: [1, 2, 3, 4, 5],
    fade: 0,
  },
  {
    slug: "inbox-zero",
    category: "work",
    name: "Inbox zero",
    mark: "icon:inbox",
    base: 0.24,
    days: [1, 2, 3, 4, 5],
    fade: -0.2,
  },
  {
    slug: "drawing",
    category: "creativity",
    name: "Drawing",
    mark: "icon:pen-tool",
    base: 0.32,
    fade: 0.5,
  },
  {
    slug: "piano",
    category: "creativity",
    name: "Piano",
    mark: "icon:piano",
    base: 0.28,
    fade: -0.4,
  },
  {
    slug: "date-night",
    category: "romance",
    name: "Date night",
    mark: "icon:heart",
    base: 0.34,
    days: [5, 6],
    fade: 0.2,
  },
  {
    slug: "adventure",
    category: "romance",
    name: "Adventure",
    mark: "icon:mountain",
    base: 0.26,
    days: [0, 6],
    fade: 0,
  },
  {
    slug: "called-home",
    category: "friends",
    name: "Called home",
    mark: "icon:phone-call",
    base: 0.3,
    days: [0],
    fade: 0,
  },
  {
    slug: "saw-friends",
    category: "friends",
    name: "Saw friends",
    mark: "icon:handshake",
    base: 0.38,
    days: [5, 6],
    fade: 0.3,
  },
];

/** Weekday multipliers: on vs off a habit's days. */
const ON_DAY = 1.6;
const OFF_DAY = 0.35;

/** No habit is ever certain. */
const P_MAX = 0.95;

export const DEMO_CATEGORY_COUNT = CATEGORIES.length;
export const DEMO_HABIT_COUNT = HABITS.length;

/** Library in `getStickerLibrary` shape. `demo-` ids fail any FK if leaked. */
export function demoLibrary(): LibraryGroup[] {
  return CATEGORIES.map((category) => ({
    categoryId: `demo-category-${category.slug}`,
    categoryName: category.name,
    slug: category.slug,
    colorKey: category.colorKey,
    stickers: HABITS.filter((habit) => habit.category === category.slug).map(
      (habit) => ({
        id: `demo-${habit.slug}`,
        name: habit.name,
        mark: habit.mark,
        colorKey: category.colorKey,
        archived: false,
      }),
    ),
  }));
}

/**
 * A year ending on `end`, in `getStickersByDay` shape. Pure, so server and
 * hydration agree. Habits are relative to `end`; moods to the calendar.
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
      // Per-habit stream, so adding a habit doesn't reshuffle the others.
      if (random(day, habit.slug) >= chance(habit, day, t, factor)) continue;

      const category = CATEGORIES.find((candidate) => candidate.slug === habit.category)!;
      activities.push({
        id: `demo-${day}-${habit.slug}`,
        activityId: `demo-${habit.slug}`,
        name: habit.name,
        mark: habit.mark,
        colorKey: category.colorKey,
      });
    }

    const day_: DayStickers = {
      activities,
      mood: random(day, "mood?") < MOOD_SHARE ? moodOf(day) : null,
      note: null,
    };

    // Empty days stay out of the Map, like the real query.
    if (activities.length > 0 || day_.mood) byDay.set(day, day_);
  }

  return byDay;
}

/** Base rate × weekday × drift, each independently editable. */
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

/** Full `fade` runs 0.25× → 1.75×, so a stopped habit reads as stopped. */
const DRIFT_SWING = 1.5;

/** Ramp centred on the base rate. Floored at 0 for `fade` outside [-1, 1]. */
function drift(habit: DemoHabit, t: number): number {
  return Math.max(0, 1 + habit.fade * (t - 0.5) * DRIFT_SWING);
}

/** Normalises to `DEMO_PER_DAY` via expected placements (pre-clamp: lands a hair under). */
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
 * Mood as two slow sinusoids (97, 23 days: coprime, not monthly) plus jitter.
 * Phase from a fixed epoch, so the wave is pinned to the calendar.
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

  // MOODS runs worst to best, like the wave: score 1 is index 0.
  const score = Math.min(5, Math.max(1, Math.round(wave)));
  return MOODS[score - 1];
}

/** Sunday 0. */
function dayOfWeek(day: DayString): number {
  // 1970-01-01 was a Thursday, which is 4.
  return (((daysBetween("1970-01-01" as DayString, day) + 4) % 7) + 7) % 7;
}

/** Deterministic [0, 1) from day + label (FNV-1a, mulberry32): hydration-safe. */
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
