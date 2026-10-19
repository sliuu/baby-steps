import assert from "node:assert/strict";
import { describe, it } from "node:test";

// Relative with extension: `node --test` has no bundler for `@/`.
import {
  MOOD_SCORE,
  RANGE_KINDS,
  RANGE_LABEL,
  activityTally,
  inBounds,
  leaders,
  moodDrift,
  moodSeries,
  moodTakeaway,
  moodTally,
  percent,
  rangePhrase,
  resolveBounds,
  takeaway,
  tally,
  type Bounds,
  type Range,
} from "./analytics.ts";
import { addDays, daysBetween } from "./daymath.ts";
import { MOODS, MOOD_LABEL, type Mood } from "./moods.ts";
import type { LibraryGroup } from "@/lib/queries/activities";
import type { StickersByDay } from "@/lib/stickers";

const TODAY = "2026-08-22";

/**
 * Three categories: one empty (must stay a zero row), and Walk archived
 * (its marks must still count).
 */
const GROUPS: LibraryGroup[] = [
  {
    categoryId: "category-health",
    categoryName: "Health",
    colorKey: "green",
    stickers: [
      { id: "act-gym", name: "Gym", mark: "G", colorKey: "green", archived: false },
      { id: "act-walk", name: "Walk", mark: "W", colorKey: "green", archived: true },
    ],
  },
  {
    categoryId: "category-spirit",
    categoryName: "Spirituality",
    colorKey: "red",
    stickers: [
      { id: "act-med", name: "Meditation", mark: "M", colorKey: "red", archived: false },
    ],
  },
  { categoryId: "category-work", categoryName: "Work", colorKey: "blue", stickers: [] },
];

/** Placement `id` never equals `activityId`, so mixing them up fails. */
function days(
  entries: Record<string, string[]>,
): StickersByDay {
  const map: StickersByDay = new Map();
  for (const [day, activityIds] of Object.entries(entries)) {
    map.set(day, {
      mood: null,
      note: null,
      activities: activityIds.map((activityId) => ({
        id: `placement-${activityId}-${day}`,
        activityId,
        name: activityId,
        mark: "x",
        colorKey: "green",
      })),
    });
  }
  return map;
}

const ALL: Bounds = { from: null, to: null };

describe("resolveBounds", () => {
  it("this month runs from the first to today", () => {
    assert.deepEqual(resolveBounds({ kind: "month" }, TODAY), {
      from: "2026-08-01",
      to: "2026-08-22",
    });
  });

  it("this year runs from 1 January to today", () => {
    assert.deepEqual(resolveBounds({ kind: "year" }, TODAY), {
      from: "2026-01-01",
      to: "2026-08-22",
    });
  });

  it("this month on the first day is a single day, not an empty range", () => {
    assert.deepEqual(resolveBounds({ kind: "month" }, "2026-08-01"), {
      from: "2026-08-01",
      to: "2026-08-01",
    });
  });

  it("this week runs from Sunday to today", () => {
    // Saturday: Sunday- vs Monday-start weeks differ most.
    assert.deepEqual(resolveBounds({ kind: "week" }, TODAY), {
      from: "2026-08-16",
      to: "2026-08-22",
    });
  });

  it("this week on a Sunday is a single day", () => {
    assert.deepEqual(resolveBounds({ kind: "week" }, "2026-08-16"), {
      from: "2026-08-16",
      to: "2026-08-16",
    });
  });

  it("the trailing ranges include today and are exactly as long as they say", () => {
    for (const [kind, length] of [
      ["days7", 7],
      ["days30", 30],
      ["days365", 365],
    ] as const) {
      const bounds = resolveBounds({ kind }, TODAY);
      assert.equal(bounds.to, TODAY, kind);
      assert.equal(daysBetween(bounds.from!, bounds.to!) + 1, length, kind);
    }
  });

  it("the trailing ranges cross month and year ends", () => {
    assert.deepEqual(resolveBounds({ kind: "days7" }, "2026-01-03"), {
      from: "2025-12-28",
      to: "2026-01-03",
    });
    assert.deepEqual(resolveBounds({ kind: "days365" }, "2026-08-22"), {
      from: "2025-08-23",
      to: "2026-08-22",
    });
  });

  it("this year and the trailing year are different ranges", () => {
    // To-date is eight months today; trailing is always twelve.
    const toDate = resolveBounds({ kind: "year" }, TODAY);
    const trailing = resolveBounds({ kind: "days365" }, TODAY);
    assert.notDeepEqual(toDate, trailing);
    assert.ok(daysBetween(toDate.from!, toDate.to!) < 364);
  });

  it("every kind but all time resolves to two real edges", () => {
    for (const kind of RANGE_KINDS) {
      if (kind === "all" || kind === "custom") continue;
      const bounds = resolveBounds({ kind } as Range, TODAY);
      assert.ok(bounds.from, kind);
      assert.equal(bounds.to, TODAY, kind);
      assert.ok(bounds.from! <= bounds.to!, kind);
    }
  });

  it("all time is open at both ends", () => {
    assert.deepEqual(resolveBounds({ kind: "all" }, TODAY), ALL);
  });

  it("a custom range is passed through", () => {
    assert.deepEqual(
      resolveBounds({ kind: "custom", from: "2026-03-01", to: "2026-04-01" }, TODAY),
      { from: "2026-03-01", to: "2026-04-01" },
    );
  });

  it("a custom range picked backwards is put in order", () => {
    assert.deepEqual(
      resolveBounds({ kind: "custom", from: "2026-04-01", to: "2026-03-01" }, TODAY),
      { from: "2026-03-01", to: "2026-04-01" },
    );
  });

  it("a half-filled custom range stays open on the missing side", () => {
    assert.deepEqual(
      resolveBounds({ kind: "custom", from: "2026-03-01", to: null }, TODAY),
      { from: "2026-03-01", to: null },
    );
    assert.deepEqual(
      resolveBounds({ kind: "custom", from: null, to: "2026-03-01" }, TODAY),
      { from: null, to: "2026-03-01" },
    );
  });

  it("does not read the clock — December gives December", () => {
    assert.deepEqual(resolveBounds({ kind: "month" }, "2026-12-31"), {
      from: "2026-12-01",
      to: "2026-12-31",
    });
  });
});

describe("inBounds", () => {
  const bounds: Bounds = { from: "2026-08-01", to: "2026-08-22" };

  it("includes both edges", () => {
    assert.equal(inBounds("2026-08-01", bounds), true);
    assert.equal(inBounds("2026-08-22", bounds), true);
  });

  it("excludes the days either side", () => {
    assert.equal(inBounds("2026-07-31", bounds), false);
    assert.equal(inBounds("2026-08-23", bounds), false);
  });

  it("compares whole dates, not day-of-month digits", () => {
    // Unpadded "2026-08-9" would sort after "2026-08-10".
    assert.equal(inBounds("2026-08-09", bounds), true);
    assert.equal(inBounds("2026-08-10", bounds), true);
    assert.equal(inBounds("2025-12-31", bounds), false);
  });

  it("an open end means everything on that side", () => {
    assert.equal(inBounds("1999-01-01", { from: null, to: "2026-08-22" }), true);
    assert.equal(inBounds("2999-01-01", { from: "2026-08-01", to: null }), true);
  });

  it("open at both ends admits every day", () => {
    assert.equal(inBounds("1999-01-01", ALL), true);
    assert.equal(inBounds("2999-12-31", ALL), true);
  });
});

describe("tally · counting", () => {
  it("counts one mark per placement, not per day", () => {
    const result = tally(
      days({ "2026-08-10": ["act-gym", "act-walk"], "2026-08-11": ["act-gym"] }),
      GROUPS,
      ALL,
    );
    assert.equal(result.total, 3);
    assert.equal(result.categories[0].count, 3); // Health has all three
  });

  it("puts each mark under its activity's category", () => {
    const result = tally(
      days({ "2026-08-10": ["act-gym", "act-med"] }),
      GROUPS,
      ALL,
    );
    assert.equal(result.categories[0].count, 1); // Health
    assert.equal(result.categories[1].count, 1); // Spirituality
  });

  it("keeps categories in the library's order, empty ones included", () => {
    const result = tally(days({ "2026-08-10": ["act-med"] }), GROUPS, ALL);
    assert.deepEqual(
      result.categories.map((category) => category.categoryName),
      ["Health", "Spirituality", "Work"],
    );
    assert.equal(result.categories[2].count, 0);
  });

  it("returns every category at zero when nothing has been placed", () => {
    const result = tally(new Map(), GROUPS, ALL);
    assert.equal(result.total, 0);
    assert.equal(result.categories.length, 3);
    assert.deepEqual(
      result.categories.map((category) => category.count),
      [0, 0, 0],
    );
  });

  it("carries each category's name and colour through", () => {
    const result = tally(new Map(), GROUPS, ALL);
    assert.equal(result.categories[1].categoryName, "Spirituality");
    assert.equal(result.categories[1].colorKey, "red");
    assert.equal(result.categories[1].categoryId, "category-spirit");
  });

  it("ignores moods — a mood is not a mark", () => {
    const map = days({ "2026-08-10": ["act-gym"] });
    map.set("2026-08-11", { activities: [], mood: "great", note: null });
    assert.equal(tally(map, GROUPS, ALL).total, 1);
  });
});

describe("tally · the range", () => {
  const map = days({
    "2025-12-31": ["act-gym"],
    "2026-07-15": ["act-gym"],
    "2026-08-01": ["act-med"],
    "2026-08-22": ["act-walk"],
  });

  it("counts only days inside the bounds", () => {
    const result = tally(map, GROUPS, resolveBounds({ kind: "month" }, TODAY));
    assert.equal(result.total, 2);
  });

  it("this year excludes last year", () => {
    const result = tally(map, GROUPS, resolveBounds({ kind: "year" }, TODAY));
    assert.equal(result.total, 3);
  });

  it("all time takes everything", () => {
    assert.equal(tally(map, GROUPS, resolveBounds({ kind: "all" }, TODAY)).total, 4);
  });

  it("a range with nothing in it is zeroes, not an empty list", () => {
    const result = tally(
      map,
      GROUPS,
      resolveBounds({ kind: "custom", from: "2020-01-01", to: "2020-12-31" }, TODAY),
    );
    assert.equal(result.total, 0);
    assert.equal(result.categories.length, 3);
  });
});

describe("tally · shares", () => {
  it("share is the exact fraction", () => {
    const result = tally(
      days({ "2026-08-10": ["act-gym", "act-walk", "act-med"] }),
      GROUPS,
      ALL,
    );
    assert.equal(result.categories[0].share, 2 / 3);
    assert.equal(result.categories[1].share, 1 / 3);
  });

  it("share is 0 rather than NaN when the range is empty", () => {
    const result = tally(new Map(), GROUPS, ALL);
    assert.equal(result.categories[0].share, 0);
    assert.equal(result.categories[0].percent, 0);
  });

  it("gives two categories with the same count the same percent", () => {
    // Why apportioning is gone: it gave equal rows different shares.
    const result = tally(days({ "2026-08-10": ["act-gym", "act-med"] }), GROUPS, ALL);
    assert.equal(result.categories[0].count, result.categories[1].count);
    assert.equal(result.categories[0].percent, result.categories[1].percent);
  });

  it("percents land within a rounding step of 100", () => {
    // Not exactly 100: per-row rounding, at most 0.05 off each.
    const result = tally(
      days({ "2026-08-10": ["act-gym", "act-walk", "act-med"] }),
      GROUPS,
      ALL,
    );
    const sum = result.categories.reduce((n, category) => n + category.percent, 0);
    assert.ok(
      Math.abs(sum - 100) <= 0.15,
      `percents summed to ${sum}, more than a rounding step from 100`,
    );
  });
});

describe("tally · unattributed", () => {
  it("is zero when every activity is in the library", () => {
    const result = tally(days({ "2026-08-10": ["act-gym"] }), GROUPS, ALL);
    assert.equal(result.unattributed, 0);
  });

  it("counts a mark whose activity has left the library", () => {
    const result = tally(
      days({ "2026-08-10": ["act-gym", "act-archived"] }),
      GROUPS,
      ALL,
    );
    assert.equal(result.unattributed, 1);
    // Still in the total; just no category.
    assert.equal(result.total, 2);
    assert.equal(
      result.categories.reduce((n, category) => n + category.count, 0),
      1,
    );
  });
});

describe("percent", () => {
  it("keeps one decimal place", () => {
    assert.equal(percent(1, 3), 33.3);
    assert.equal(percent(2, 3), 66.7);
  });

  it("depends on nothing but its own two numbers", () => {
    // Pure in (count, total), so equal counts can't differ.
    assert.equal(percent(11, 63), percent(11, 63));
    assert.equal(percent(11, 63), 17.5);
  });

  it("gives an exact split exactly", () => {
    assert.equal(percent(1, 4), 25);
    assert.equal(percent(1, 2), 50);
  });

  it("is 0 rather than NaN when the total is zero", () => {
    assert.equal(percent(0, 0), 0);
  });

  it("gives a lone category the whole 100", () => {
    assert.equal(percent(5, 5), 100);
  });

  it("keeps a tiny share visible instead of rounding it away", () => {
    // One decimal keeps 1/1000 visible.
    assert.equal(percent(1, 1000), 0.1);
    assert.equal(percent(999, 1000), 99.9);
  });

  it("rounds away only below a twentieth of a percent", () => {
    // 1/5000 still rounds to 0; the count column shows it happened.
    assert.equal(percent(1, 5000), 0);
  });
});

/** Mood-only days, so `moodTally` assertions ignore activities. */
function moodDays(entries: Record<string, Mood>): StickersByDay {
  const map: StickersByDay = new Map();
  for (const [day, mood] of Object.entries(entries)) {
    map.set(day, { mood, activities: [], note: null });
  }
  return map;
}

/** Real faces: `activityTally` carries name/mark/colour and ties on name. */
const FACES: Record<string, { name: string; mark: string; colorKey: string }> = {
  "act-gym": { name: "Gym", mark: "G", colorKey: "green" },
  "act-med": { name: "Meditation", mark: "M", colorKey: "red" },
  "act-walk": { name: "Walk", mark: "W", colorKey: "green" },
};

function faced(entries: Record<string, string[]>): StickersByDay {
  const map: StickersByDay = new Map();
  for (const [day, activityIds] of Object.entries(entries)) {
    map.set(day, {
      mood: null,
      note: null,
      activities: activityIds.map((activityId) => ({
        id: `placement-${activityId}-${day}`,
        activityId,
        ...FACES[activityId],
      })),
    });
  }
  return map;
}

describe("activityTally", () => {
  it("ranks habits biggest first", () => {
    const ranking = activityTally(
      faced({
        "2026-08-01": ["act-gym", "act-med"],
        "2026-08-02": ["act-med"],
        "2026-08-03": ["act-med"],
      }),
      ALL,
    );

    assert.deepEqual(
      ranking.activities.map((a) => [a.name, a.count]),
      [
        ["Meditation", 3],
        ["Gym", 1],
      ],
    );
    assert.equal(ranking.total, 4);
  });

  it("counts two placements of one sticker on one day as two", () => {
    // Counts placements, not days.
    const ranking = activityTally(
      faced({ "2026-08-01": ["act-gym", "act-gym"] }),
      ALL,
    );

    assert.deepEqual(ranking.activities.map((a) => a.count), [2]);
  });

  it("carries the face through from the placement", () => {
    const [top] = activityTally(faced({ "2026-08-01": ["act-med"] }), ALL)
      .activities;

    assert.equal(top.activityId, "act-med");
    assert.equal(top.name, "Meditation");
    assert.equal(top.mark, "M");
    assert.equal(top.colorKey, "red");
  });

  it("leaves out habits with nothing in range, rather than listing zeros", () => {
    // Unlike `tally`, no zero rows.
    const ranking = activityTally(faced({ "2026-08-01": ["act-gym"] }), ALL);

    assert.deepEqual(ranking.activities.map((a) => a.name), ["Gym"]);
  });

  it("breaks a tie by name, not by whatever order the map yielded", () => {
    // Walk is placed first; ties must sort by name.
    const ranking = activityTally(
      faced({ "2026-08-01": ["act-walk", "act-gym"] }),
      ALL,
    );

    assert.deepEqual(ranking.activities.map((a) => a.name), ["Gym", "Walk"]);
  });

  it("obeys the range", () => {
    const ranking = activityTally(
      faced({
        "2026-07-31": ["act-gym", "act-gym", "act-gym"],
        "2026-08-05": ["act-med"],
      }),
      { from: "2026-08-01", to: "2026-08-31" },
    );

    assert.deepEqual(ranking.activities.map((a) => a.name), ["Meditation"]);
    assert.equal(ranking.total, 1);
  });

  it("shares are of the range's total, and add up", () => {
    const ranking = activityTally(
      faced({ "2026-08-01": ["act-gym", "act-gym", "act-med", "act-walk"] }),
      ALL,
    );

    assert.deepEqual(ranking.activities.map((a) => a.share), [0.5, 0.25, 0.25]);
    assert.deepEqual(ranking.activities.map((a) => a.percent), [50, 25, 25]);
  });

  it("is empty when nothing is in range", () => {
    assert.deepEqual(activityTally(faced({}), ALL), {
      activities: [],
      total: 0,
    });
  });
});

describe("moodTally", () => {
  it("counts days per mood", () => {
    const result = moodTally(
      moodDays({
        "2026-08-01": "great",
        "2026-08-02": "good",
        "2026-08-03": "good",
      }),
      ALL,
    );

    assert.equal(result.total, 3);
    assert.deepEqual(
      result.moods.map((m) => [m.mood, m.count]),
      [
        ["rough", 0],
        ["low", 0],
        ["okay", 0],
        ["good", 2],
        ["great", 1],
      ],
    );
  });

  it("returns all five in the scale's order, never sorted", () => {
    // Scale order, not ranked.
    const result = moodTally(
      moodDays({
        "2026-08-01": "rough",
        "2026-08-02": "rough",
        "2026-08-03": "great",
      }),
      ALL,
    );

    assert.deepEqual(result.moods.map((m) => m.mood), MOODS);
  });

  it("labels each mood from MOOD_LABEL", () => {
    const result = moodTally(moodDays({}), ALL);
    assert.deepEqual(
      result.moods.map((m) => m.label),
      MOODS.map((mood) => MOOD_LABEL[mood]),
    );
  });

  it("counts only days inside the bounds", () => {
    const result = moodTally(
      moodDays({
        "2026-07-31": "great",
        "2026-08-01": "good",
        "2026-08-23": "low",
      }),
      { from: "2026-08-01", to: TODAY },
    );

    assert.equal(result.total, 1);
    assert.equal(result.moods.find((m) => m.mood === "good")?.count, 1);
  });

  it("ignores days with no mood — a day with stickers is not a feeling", () => {
    const result = moodTally(days({ "2026-08-01": ["act-gym", "act-walk"] }), ALL);

    assert.equal(result.total, 0);
    assert.deepEqual(result.moods.map((m) => m.count), [0, 0, 0, 0, 0]);
  });

  it("counts days, not marks — one mood per day however busy it was", () => {
    const map = days({ "2026-08-01": ["act-gym", "act-walk", "act-med"] });
    map.set("2026-08-01", { ...map.get("2026-08-01")!, mood: "okay" });

    assert.equal(moodTally(map, ALL).total, 1);
  });
});

/** Consecutive-day moods from `from`. Merge two runs to make a gap. */
function moodRun(from: string, moods: Mood[]): StickersByDay {
  const map: StickersByDay = new Map();
  moods.forEach((mood, i) => {
    map.set(addDays(from, i), { mood, activities: [], note: null });
  });
  return map;
}

function merge(...maps: StickersByDay[]): StickersByDay {
  const out: StickersByDay = new Map();
  for (const map of maps) for (const [day, value] of map) out.set(day, value);
  return out;
}

describe("MOOD_SCORE", () => {
  it("runs 1 up to 5 in the scale's order", () => {
    // Keeps the written-out scores in step with `MOODS`.
    assert.deepEqual(
      MOODS.map((mood) => MOOD_SCORE[mood]),
      [1, 2, 3, 4, 5],
    );
  });
});

describe("moodSeries", () => {
  it("is empty for a range with no moods in it", () => {
    const result = moodSeries(days({ "2026-08-01": ["act-gym"] }), ALL);

    assert.deepEqual(result.points, []);
    assert.equal(result.from, null);
    assert.equal(result.to, null);
  });

  it("keeps only the days that carry a mood", () => {
    const map = merge(
      moodRun("2026-08-01", ["great", "good"]),
      days({ "2026-08-03": ["act-gym"] }),
    );

    // Unrated day: nothing invented.
    assert.deepEqual(moodSeries(map, ALL).points.map((p) => p.day), [
      "2026-08-01",
      "2026-08-02",
    ]);
  });

  it("sorts by day, whatever order the map arrived in", () => {
    const map: StickersByDay = new Map();
    for (const day of ["2026-08-03", "2026-08-01", "2026-08-02"]) {
      map.set(day, { mood: "okay", activities: [], note: null });
    }

    // Input is query order; fails first if the sort is dropped.
    assert.deepEqual(moodSeries(map, ALL).points.map((p) => p.day), [
      "2026-08-01",
      "2026-08-02",
      "2026-08-03",
    ]);
  });

  it("scores and labels each point from the mood", () => {
    const [point] = moodSeries(moodRun("2026-08-01", ["low"]), ALL).points;

    assert.equal(point.mood, "low");
    assert.equal(point.score, 2);
    assert.equal(point.label, MOOD_LABEL.low);
  });

  it("obeys the bounds", () => {
    const result = moodSeries(
      moodRun("2026-07-30", ["great", "good", "okay", "low"]),
      { from: "2026-07-31", to: "2026-08-01" },
    );

    assert.deepEqual(result.points.map((p) => p.day), ["2026-07-31", "2026-08-01"]);
    assert.equal(result.from, "2026-07-31");
    assert.equal(result.to, "2026-08-01");
  });

  it("spaces points by date, not by index", () => {
    const map = merge(
      moodRun("2026-08-01", ["great"]),
      moodRun("2026-08-02", ["good"]),
      moodRun("2026-08-11", ["okay"]),
    );

    // Positioned by date: day two is a tenth along.
    assert.deepEqual(moodSeries(map, ALL).points.map((p) => p.at), [0, 0.1, 1]);
  });

  it("centres a lone point rather than pinning it to the left edge", () => {
    const [point] = moodSeries(moodRun("2026-08-01", ["okay"]), ALL).points;

    // Zero span would be 0/0.
    assert.equal(point.at, 0.5);
  });

  it("never smooths — a spike is a spike however long the series is", () => {
    // No smoothing: scores stay the moods.
    const moods: Mood[] = Array.from({ length: 20 }, (_, i) =>
      i === 10 ? "rough" : "great",
    );
    const result = moodSeries(moodRun("2026-08-01", moods), ALL);

    assert.equal(result.points[10].score, 1);
    assert.deepEqual(
      result.points.map((p) => p.score),
      moods.map((mood) => MOOD_SCORE[mood]),
    );
  });

  it("breaks the line when more than a week goes unlogged", () => {
    const map = merge(
      moodRun("2026-08-01", ["great", "good"]),
      // Seven days later: exactly on the boundary, joined.
      moodRun("2026-08-09", ["okay"]),
      // Eight days after that: broken.
      moodRun("2026-08-17", ["low"]),
    );

    assert.deepEqual(moodSeries(map, ALL).points.map((p) => p.gap), [
      false,
      false,
      false,
      true,
    ]);
  });
});

describe("moodDrift", () => {
  const drift = (moods: Mood[]) => moodDrift(moodSeries(moodRun("2026-08-01", moods), ALL));

  it("says nothing under six points", () => {
    // Too few points for any verdict, "steady" included.
    assert.equal(drift(["great", "great", "good", "low", "rough"]), null);
  });

  it("calls a climb", () => {
    assert.equal(drift(["rough", "low", "low", "good", "great", "great"]), "up");
  });

  it("calls a dip", () => {
    assert.equal(drift(["great", "great", "good", "low", "low", "rough"]), "down");
  });

  it("calls a flat run steady", () => {
    assert.equal(drift(["okay", "okay", "okay", "okay", "okay", "okay"]), "steady");
  });

  it("holds steady when the move is under half a rung", () => {
    // 4.33 vs 4.33: under half a rung is steady.
    assert.equal(drift(["great", "good", "good", "good", "good", "great"]), "steady");
  });

  it("is not decided by a single day at either end", () => {
    // Halves, not endpoints: 4 vs 3.57.
    const moods: Mood[] = Array.from({ length: 15 }, (_, i) =>
      i === 14 ? "rough" : "good",
    );

    assert.equal(drift(moods), "steady");
  });

  it("is swung by an outlier when the series is barely long enough", () => {
    // At six points one rough day is a third of each half.
    assert.equal(drift(["good", "good", "good", "good", "good", "rough"]), "down");
  });

  it("drops the middle point of an odd run rather than favouring a side", () => {
    const result = drift(["rough", "rough", "rough", "great", "great", "great", "great"]);

    // Odd count: middle point ignored.
    assert.equal(result, "up");
  });
});

describe("moodTakeaway", () => {
  const say = (moods: Mood[]) =>
    moodTakeaway(moodSeries(moodRun("2026-08-01", moods), ALL), "this month");

  it("has nothing to say about an empty series", () => {
    assert.equal(moodTakeaway(moodSeries(new Map(), ALL), "this month"), null);
  });

  it("names the shortfall rather than guessing a direction", () => {
    const line = say(["great", "good"]);

    assert.ok(line?.includes("2 logged days"));
    assert.ok(line?.includes("not enough"));
  });

  it("says one logged day, singular", () => {
    assert.ok(say(["great"])?.includes("1 logged day "));
  });

  it("reports the direction and the sample it rests on", () => {
    const line = say(["rough", "low", "low", "good", "great", "great"]);

    assert.ok(line?.includes("climbing"));
    assert.ok(line?.includes("this month"));
    assert.ok(line?.includes("6 logged days"));
  });

  it("never prints a score", () => {
    // Invented scale: never print scores.
    for (const line of [
      say(["rough", "low", "low", "good", "great", "great"]),
      say(["great", "great", "good", "low", "low", "rough"]),
      say(["okay", "okay", "okay", "okay", "okay", "okay"]),
    ]) {
      assert.doesNotMatch(line!, /\d+\.\d/);
    }
  });
});

describe("leaders", () => {
  it("returns the single biggest category", () => {
    const result = leaders(
      tally(
        days({
          "2026-08-01": ["act-gym", "act-walk"],
          "2026-08-02": ["act-med"],
        }),
        GROUPS,
        ALL,
      ),
    );

    assert.deepEqual(result.map((a) => a.categoryName), ["Health"]);
  });

  it("returns every category tied at the top", () => {
    const result = leaders(
      tally(
        days({ "2026-08-01": ["act-gym", "act-med"] }),
        GROUPS,
        ALL,
      ),
    );

    // Tied: name both.
    assert.deepEqual(result.map((a) => a.categoryName), ["Health", "Spirituality"]);
  });

  it("keeps ties in library order, not sorted", () => {
    const result = leaders(tally(days({ "2026-08-01": ["act-med", "act-gym"] }), GROUPS, ALL));
    assert.deepEqual(result.map((a) => a.categoryId), ["category-health", "category-spirit"]);
  });

  it("is empty when nothing is in range", () => {
    // All zero: explicit guard, not `Math.max` luck.
    assert.deepEqual(leaders(tally(days({}), GROUPS, ALL)), []);
  });

  it("is empty when there are no categories at all", () => {
    assert.deepEqual(leaders(tally(days({}), [], ALL)), []);
  });
});

describe("rangePhrase", () => {
  it("reads as an adverbial, not as the dropdown's label", () => {
    assert.equal(rangePhrase({ kind: "week" }), "this week");
    assert.equal(rangePhrase({ kind: "days7" }), "in the last 7 days");
    assert.equal(rangePhrase({ kind: "month" }), "this month");
    assert.equal(rangePhrase({ kind: "days30" }), "in the last 30 days");
    assert.equal(rangePhrase({ kind: "year" }), "this year");
    assert.equal(rangePhrase({ kind: "days365" }), "in the last 12 months");
    assert.equal(rangePhrase({ kind: "all" }), "so far");
    assert.equal(
      rangePhrase({ kind: "custom", from: "2026-08-01", to: "2026-08-22" }),
      "in this range",
    );
  });

  it("has a phrase and a label for every kind the dropdown offers", () => {
    // A new kind without a label/phrase would be a blank option or clause.
    for (const kind of RANGE_KINDS) {
      const range = { kind, from: null, to: null } as Range;
      assert.ok(RANGE_LABEL[kind], kind);
      assert.ok(rangePhrase(range).length > 0, kind);
    }
  });
});

describe("takeaway", () => {
  const phrase = "this month";

  it("names one leader", () => {
    const result = takeaway(
      tally(
        days({
          "2026-08-01": ["act-gym", "act-walk"],
          "2026-08-02": ["act-med"],
        }),
        GROUPS,
        ALL,
      ),
      phrase,
    );

    assert.equal(
      result,
      "Health held the greatest share of your attention this month.",
    );
  });

  it("names two tied leaders", () => {
    const result = takeaway(
      tally(days({ "2026-08-01": ["act-gym", "act-med"] }), GROUPS, ALL),
      phrase,
    );

    assert.equal(
      result,
      "Health and Spirituality tied for the greatest share of your attention this month.",
    );
  });

  it("counts leaders instead of listing them past three", () => {
    const groups: LibraryGroup[] = [
      ...GROUPS,
      {
        categoryId: "category-play",
        categoryName: "Play",
        colorKey: "yellow",
        stickers: [
          { id: "act-piano", name: "Piano", mark: "P", colorKey: "yellow", archived: false },
        ],
      },
      {
        categoryId: "category-rest",
        categoryName: "Rest",
        colorKey: "purple",
        stickers: [
          { id: "act-nap", name: "Nap", mark: "N", colorKey: "purple", archived: false },
        ],
      },
    ];
    // Four-way tie on 1, Work on 0: not a flat range.
    const result = takeaway(
      tally(
        days({ "2026-08-01": ["act-gym", "act-med", "act-piano", "act-nap"] }),
        groups,
        ALL,
      ),
      phrase,
    );

    assert.equal(
      result,
      "4 categories tied for the greatest share of your attention this month.",
    );
  });

  it("calls a fully flat range spread, not a tie for the lead", () => {
    const result = takeaway(
      tally(
        days({ "2026-08-01": ["act-gym", "act-med"] }),
        GROUPS.slice(0, 2),
        ALL,
      ),
      phrase,
    );

    assert.equal(
      result,
      "Your attention was spread evenly across every category this month.",
    );
  });

  it("is null when nothing is in range — the page has an empty state already", () => {
    assert.equal(takeaway(tally(days({}), GROUPS, ALL), phrase), null);
  });
});
