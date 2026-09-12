import assert from "node:assert/strict";
import { describe, it } from "node:test";

// Relative, with the extension. Same rule as every other test in here: there is
// no bundler in this process, so `@/lib/habits` would resolve to nothing.
import {
  HABITS_PER_PAGE,
  SORT_START,
  earliestPlacement,
  frequencyLabel,
  habitTable,
  habitWindow,
  pageCount,
  pageOf,
  sortHabits,
  type HabitRow,
  type HabitSortKey,
} from "./habits.ts";
import { resolveBounds } from "./analytics.ts";
import type { LibraryGroup } from "@/lib/queries/activities";
import type { StickersByDay } from "@/lib/stickers";

/**
 * Two areas, three habits, one retired — `lib/heatmap.test.ts`'s fixture,
 * because the two modules share their row rule and a shared rule deserves a
 * shared shape of test. Walk is archived and that is the point: the same
 * library has to produce a different number of rows depending on whether Walk
 * was placed inside the window.
 *
 * The areas are named so that alphabetical order ("Health", "Spirituality")
 * matches library order, and the sort tests below rely on being able to tell
 * those two apart — so one test deliberately builds a library in the other
 * order.
 */
const GROUPS: LibraryGroup[] = [
  {
    areaId: "area-health",
    areaName: "Health",
    colorKey: "green",
    stickers: [
      { id: "act-gym", name: "Gym", mark: "G", colorKey: "green", archived: false },
      { id: "act-walk", name: "Walk", mark: "W", colorKey: "green", archived: true },
    ],
  },
  {
    areaId: "area-spirit",
    areaName: "Spirituality",
    colorKey: "red",
    stickers: [
      { id: "act-med", name: "Meditation", mark: "M", colorKey: "red", archived: false },
    ],
  },
];

/**
 * Placements by day. The placement `id` can never equal the `activityId`, which
 * is the guard against counting by the wrong one — a table built on `id` comes
 * out as a column of ones.
 *
 * `name`, `mark` and `colorKey` are wrong on purpose: the placement carries a
 * joined name in the real query, and the point of the fixture is that
 * `habitTable` reads the *library's* name, not this one.
 */
function days(entries: Record<string, string[]>): StickersByDay {
  const map: StickersByDay = new Map();
  for (const [day, activityIds] of Object.entries(entries)) {
    map.set(day, {
      mood: null,
      note: null,
      activities: activityIds.map((activityId) => ({
        id: `placement-${activityId}-${day}`,
        activityId,
        name: `joined-${activityId}`,
        mark: "?",
        colorKey: "blue",
      })),
    });
  }
  return map;
}

/** A day carrying a mood and nothing else — the calendar writes these. */
function moodOnly(day: string): StickersByDay {
  return new Map([[day, { mood: "good" as const, note: null, activities: [] }]]);
}

function rowFor(rows: HabitRow[], id: string): HabitRow {
  const row = rows.find((r) => r.activityId === id);
  assert.ok(row, `no row for ${id}`);
  return row;
}

const WINDOW = habitWindow({ from: "2026-09-01", to: "2026-09-30" }, "2026-09-12", null);

describe("earliestPlacement", () => {
  it("finds the oldest day with a mark on it", () => {
    const map = days({
      "2026-09-10": ["act-gym"],
      "2026-03-02": ["act-med"],
      "2026-07-01": ["act-gym"],
    });
    assert.equal(earliestPlacement(map), "2026-03-02");
  });

  it("is null for an empty history", () => {
    assert.equal(earliestPlacement(new Map()), null);
  });

  it("ignores a day that carries only a mood", () => {
    // The window is about placements. A day you recorded a feeling on but
    // placed nothing is not where the counting starts.
    assert.equal(earliestPlacement(moodOnly("2020-01-01")), null);
  });

  it("does not depend on the map's order", () => {
    const forwards = days({ "2026-01-01": ["act-gym"], "2026-02-01": ["act-gym"] });
    const backwards = days({ "2026-02-01": ["act-gym"], "2026-01-01": ["act-gym"] });
    assert.equal(earliestPlacement(forwards), "2026-01-01");
    assert.equal(earliestPlacement(backwards), "2026-01-01");
  });
});

describe("habitWindow", () => {
  it("counts both edges — a single day is one day, not zero", () => {
    const window = habitWindow({ from: "2026-09-12", to: "2026-09-12" }, "2026-09-12", null);
    assert.deepEqual(window, { from: "2026-09-12", to: "2026-09-12", days: 1 });
  });

  it("measures a month inclusively", () => {
    assert.equal(WINDOW.days, 30);
  });

  it("closes an open right edge at today", () => {
    const window = habitWindow({ from: "2026-09-01", to: null }, "2026-09-12", null);
    assert.equal(window.to, "2026-09-12");
    assert.equal(window.days, 12);
  });

  it("closes an open left edge at the first placement", () => {
    const window = habitWindow({ from: null, to: null }, "2026-09-12", "2026-09-03");
    assert.deepEqual(window, { from: "2026-09-03", to: "2026-09-12", days: 10 });
  });

  it("collapses to today when there is no history at all", () => {
    // All time over an empty database. One day rather than a span back to the
    // epoch, which would draw every plot as a tick against 20,000 days of
    // nothing.
    const window = habitWindow({ from: null, to: null }, "2026-09-12", null);
    assert.deepEqual(window, { from: "2026-09-12", to: "2026-09-12", days: 1 });
  });

  it("keeps a custom range that runs into the future", () => {
    // The span the user drew is the span the rates are about, even the part of
    // it that hasn't happened.
    const window = habitWindow({ from: "2026-09-01", to: "2026-12-31" }, "2026-09-12", null);
    assert.equal(window.to, "2026-12-31");
    assert.equal(window.days, 122);
  });

  it("never runs backwards", () => {
    // A left edge past the right one would make every position in the plot
    // negative. Reachable when the clock is behind the data.
    const window = habitWindow({ from: "2026-09-30", to: null }, "2026-09-12", null);
    assert.equal(window.from, "2026-09-12");
    assert.equal(window.days, 1);
  });

  it("agrees with the ranges the picker offers", () => {
    const today = "2026-09-12";
    assert.equal(habitWindow(resolveBounds({ kind: "days7" }, today), today, null).days, 7);
    assert.equal(habitWindow(resolveBounds({ kind: "days30" }, today), today, null).days, 30);
    assert.equal(habitWindow(resolveBounds({ kind: "days365" }, today), today, null).days, 365);
    // 2026-09-12 is a Saturday, so its week is the full seven.
    assert.equal(habitWindow(resolveBounds({ kind: "week" }, today), today, null).days, 7);
  });
});

describe("habitTable · which rows exist", () => {
  it("gives a live habit a row even with nothing in the window", () => {
    const rows = habitTable(new Map(), GROUPS, WINDOW);
    assert.deepEqual(
      rows.map((r) => r.activityId),
      ["act-gym", "act-med"],
    );
  });

  it("leaves an archived habit out when it was not placed in the window", () => {
    const rows = habitTable(days({ "2026-09-05": ["act-gym"] }), GROUPS, WINDOW);
    assert.ok(!rows.some((r) => r.activityId === "act-walk"));
  });

  it("keeps an archived habit that was placed in the window", () => {
    const rows = habitTable(days({ "2026-09-05": ["act-walk"] }), GROUPS, WINDOW);
    assert.equal(rowFor(rows, "act-walk").count, 1);
  });

  it("drops marks whose activity has left the library", () => {
    const rows = habitTable(days({ "2026-09-05": ["act-ghost"] }), GROUPS, WINDOW);
    assert.ok(!rows.some((r) => r.activityId === "act-ghost"));
    assert.equal(rows.length, 2);
  });

  it("comes out in library order, not sorted", () => {
    // Meditation is placed more often and still comes second, because sorting
    // is the table's own state and this function has no opinion about it.
    const rows = habitTable(
      days({ "2026-09-05": ["act-med"], "2026-09-06": ["act-med"], "2026-09-07": ["act-gym"] }),
      GROUPS,
      WINDOW,
    );
    assert.deepEqual(
      rows.map((r) => r.activityId),
      ["act-gym", "act-med"],
    );
  });

  it("is empty when the library is", () => {
    assert.deepEqual(habitTable(days({ "2026-09-05": ["act-gym"] }), [], WINDOW), []);
  });
});

describe("habitTable · what a row says", () => {
  it("names the habit from the library and the area from its group", () => {
    const rows = habitTable(days({ "2026-09-05": ["act-gym"] }), GROUPS, WINDOW);
    const gym = rowFor(rows, "act-gym");
    // Not `joined-act-gym`: the fixture's placement name is wrong on purpose.
    assert.equal(gym.name, "Gym");
    assert.equal(gym.mark, "G");
    assert.equal(gym.colorKey, "green");
    assert.equal(gym.areaId, "area-health");
    assert.equal(gym.areaName, "Health");
  });

  it("counts marks, not days", () => {
    const map = days({ "2026-09-05": ["act-gym", "act-gym"], "2026-09-06": ["act-gym"] });
    const gym = rowFor(habitTable(map, GROUPS, WINDOW), "act-gym");
    assert.equal(gym.count, 3);
    assert.equal(gym.days, 2);
  });

  it("plots one tick per day, however many marks that day holds", () => {
    const map = days({ "2026-09-05": ["act-gym", "act-gym", "act-gym"] });
    const gym = rowFor(habitTable(map, GROUPS, WINDOW), "act-gym");
    assert.deepEqual(gym.hits, [4]);
  });

  it("measures hits as offsets from the window's first day", () => {
    const map = days({ "2026-09-01": ["act-gym"], "2026-09-30": ["act-gym"] });
    const gym = rowFor(habitTable(map, GROUPS, WINDOW), "act-gym");
    assert.deepEqual(gym.hits, [0, 29]);
  });

  it("sorts hits ascending whatever order the days arrive in", () => {
    const map = days({
      "2026-09-20": ["act-gym"],
      "2026-09-02": ["act-gym"],
      "2026-09-11": ["act-gym"],
    });
    assert.deepEqual(rowFor(habitTable(map, GROUPS, WINDOW), "act-gym").hits, [1, 10, 19]);
  });

  it("records the first and last day inside the window", () => {
    const map = days({
      "2026-09-04": ["act-gym"],
      "2026-09-18": ["act-gym"],
      "2026-09-09": ["act-gym"],
    });
    const gym = rowFor(habitTable(map, GROUPS, WINDOW), "act-gym");
    assert.equal(gym.first, "2026-09-04");
    assert.equal(gym.last, "2026-09-18");
  });

  it("leaves an untouched row empty rather than zeroed-and-dated", () => {
    const gym = rowFor(habitTable(new Map(), GROUPS, WINDOW), "act-gym");
    assert.equal(gym.count, 0);
    assert.equal(gym.days, 0);
    assert.deepEqual(gym.hits, []);
    assert.equal(gym.first, null);
    assert.equal(gym.last, null);
    assert.equal(gym.interval, null);
  });

  it("counts nothing outside the window", () => {
    const map = days({
      "2026-08-31": ["act-gym"],
      "2026-09-15": ["act-gym"],
      "2026-10-01": ["act-gym"],
    });
    const gym = rowFor(habitTable(map, GROUPS, WINDOW), "act-gym");
    assert.equal(gym.count, 1);
    assert.equal(gym.first, "2026-09-15");
    assert.equal(gym.last, "2026-09-15");
  });

  it("counts both edge days — the window is closed", () => {
    const map = days({ "2026-09-01": ["act-gym"], "2026-09-30": ["act-gym"] });
    assert.equal(rowFor(habitTable(map, GROUPS, WINDOW), "act-gym").count, 2);
  });

  it("keeps two habits' marks apart on a shared day", () => {
    const map = days({ "2026-09-05": ["act-gym", "act-med"] });
    const rows = habitTable(map, GROUPS, WINDOW);
    assert.equal(rowFor(rows, "act-gym").count, 1);
    assert.equal(rowFor(rows, "act-med").count, 1);
  });
});

describe("habitTable · the interval", () => {
  it("divides the window by the count, not by the observed stretch", () => {
    // Two marks a day apart in a 30-day window is every 15 days. The other
    // reading — every 1 day — would make the row disagree with its own plot,
    // which shows two ticks at the left edge and 28 empty days.
    const map = days({ "2026-09-01": ["act-gym"], "2026-09-02": ["act-gym"] });
    assert.equal(rowFor(habitTable(map, GROUPS, WINDOW), "act-gym").interval, 15);
  });

  it("is null under two marks, where there is no rate to state", () => {
    const once = days({ "2026-09-05": ["act-gym"] });
    assert.equal(rowFor(habitTable(once, GROUPS, WINDOW), "act-gym").interval, null);
    assert.equal(rowFor(habitTable(new Map(), GROUPS, WINDOW), "act-gym").interval, null);
  });

  it("goes below one for something done more than daily", () => {
    const map = days({
      "2026-09-01": ["act-gym", "act-gym"],
      "2026-09-02": ["act-gym", "act-gym"],
    });
    const window = habitWindow({ from: "2026-09-01", to: "2026-09-02" }, "2026-09-12", null);
    assert.equal(rowFor(habitTable(map, GROUPS, window), "act-gym").interval, 0.5);
  });

  it("is one day when the count equals the window", () => {
    const map = days({ "2026-09-01": ["act-gym"], "2026-09-02": ["act-gym"] });
    const window = habitWindow({ from: "2026-09-01", to: "2026-09-02" }, "2026-09-12", null);
    assert.equal(rowFor(habitTable(map, GROUPS, window), "act-gym").interval, 1);
  });
});

describe("frequencyLabel", () => {
  function row(over: Partial<HabitRow>): HabitRow {
    return {
      activityId: "act-gym",
      name: "Gym",
      mark: "G",
      colorKey: "green",
      areaId: "area-health",
      areaName: "Health",
      count: 0,
      days: 0,
      hits: [],
      first: null,
      last: null,
      interval: null,
      ...over,
    };
  }

  it("is null for a habit with nothing in the window", () => {
    assert.equal(frequencyLabel(row({})), null);
  });

  it("says Once rather than stating a rate for a single mark", () => {
    assert.equal(frequencyLabel(row({ count: 1 })), "Once");
  });

  it("rounds to whole days", () => {
    assert.equal(frequencyLabel(row({ count: 4, interval: 7.5 })), "About every 8 days");
    assert.equal(frequencyLabel(row({ count: 4, interval: 7.4 })), "About every 7 days");
  });

  it("says About daily rather than about every 1 days", () => {
    assert.equal(frequencyLabel(row({ count: 30, interval: 1 })), "About daily");
    assert.equal(frequencyLabel(row({ count: 30, interval: 1.2 })), "About daily");
  });

  it("says About daily for something done more than once a day", () => {
    // A calendar of days cannot say more than daily, and it shouldn't try.
    assert.equal(frequencyLabel(row({ count: 60, interval: 0.5 })), "About daily");
  });

  it("counts in days all the way up, never in weeks", () => {
    assert.equal(frequencyLabel(row({ count: 2, interval: 21 })), "About every 21 days");
    assert.equal(frequencyLabel(row({ count: 2, interval: 182.5 })), "About every 183 days");
  });
});

describe("SORT_START", () => {
  it("starts every column at its useful end", () => {
    // Counts and last-done open on the biggest and the most recent; frequency
    // ascends because the smallest interval is the most-done habit. Same
    // intent, opposite arrows, which is why it is a table.
    assert.deepEqual(SORT_START, {
      area: "asc",
      count: "desc",
      interval: "asc",
      first: "asc",
      last: "desc",
    });
  });
});

describe("sortHabits", () => {
  /** Four rows with distinct values in every sortable column. */
  const ROWS: HabitRow[] = [
    {
      activityId: "a",
      name: "Alpha",
      mark: "A",
      colorKey: "green",
      areaId: "area-1",
      areaName: "Body",
      count: 9,
      days: 9,
      hits: [1],
      first: "2026-09-02",
      last: "2026-09-11",
      interval: 3.3,
    },
    {
      activityId: "b",
      name: "Bravo",
      mark: "B",
      colorKey: "red",
      areaId: "area-2",
      areaName: "Craft",
      count: 2,
      days: 2,
      hits: [5],
      first: "2026-09-06",
      last: "2026-09-07",
      interval: 15,
    },
    {
      activityId: "c",
      name: "Charlie",
      mark: "C",
      colorKey: "blue",
      areaId: "area-3",
      areaName: "Admin",
      count: 1,
      days: 1,
      hits: [20],
      first: "2026-09-21",
      last: "2026-09-21",
      interval: null,
    },
    {
      activityId: "d",
      name: "Delta",
      mark: "D",
      colorKey: "yellow",
      areaId: "area-4",
      areaName: "Zeal",
      count: 0,
      days: 0,
      hits: [],
      first: null,
      last: null,
      interval: null,
    },
  ];

  const ids = (rows: HabitRow[]) => rows.map((r) => r.activityId);

  it("does not touch the array it was given", () => {
    const before = ids(ROWS);
    sortHabits(ROWS, "count", "asc");
    assert.deepEqual(ids(ROWS), before);
  });

  it("orders by count in both directions", () => {
    assert.deepEqual(ids(sortHabits(ROWS, "count", "desc")), ["a", "b", "c", "d"]);
    assert.deepEqual(ids(sortHabits(ROWS, "count", "asc")), ["d", "c", "b", "a"]);
  });

  it("orders by area name, alphabetically", () => {
    assert.deepEqual(ids(sortHabits(ROWS, "area", "asc")), ["c", "a", "b", "d"]);
    assert.deepEqual(ids(sortHabits(ROWS, "area", "desc")), ["d", "b", "a", "c"]);
  });

  it("treats a single mark as rarer than any rate", () => {
    // Charlie has one mark and no interval. Ascending by frequency runs from
    // most-often to least, so it lands last among the rows that have marks —
    // and ahead of Delta, which has none.
    assert.deepEqual(ids(sortHabits(ROWS, "interval", "asc")), ["a", "b", "c", "d"]);
    assert.deepEqual(ids(sortHabits(ROWS, "interval", "desc")), ["c", "b", "a", "d"]);
  });

  it("orders by last done, most recent first", () => {
    assert.deepEqual(ids(sortHabits(ROWS, "last", "desc")), ["c", "a", "b", "d"]);
  });

  it("orders by the day the plot starts", () => {
    assert.deepEqual(ids(sortHabits(ROWS, "first", "asc")), ["a", "b", "c", "d"]);
  });

  it("sinks the empty rows whichever way the arrow points", () => {
    for (const key of ["interval", "first", "last"] as const) {
      for (const direction of ["asc", "desc"] as const) {
        assert.equal(
          ids(sortHabits(ROWS, key, direction)).at(-1),
          "d",
          `${key} ${direction}`,
        );
      }
    }
  });

  it("breaks ties by name, the same way every time", () => {
    const tied: HabitRow[] = [
      { ...ROWS[0], activityId: "z", name: "Zulu", count: 5 },
      { ...ROWS[0], activityId: "m", name: "Mike", count: 5 },
      { ...ROWS[0], activityId: "e", name: "Echo", count: 5 },
    ];
    // Ascending and descending agree, because the tie-break is not flipped by
    // the direction: it is the stable order underneath it.
    assert.deepEqual(ids(sortHabits(tied, "count", "desc")), ["e", "m", "z"]);
    assert.deepEqual(ids(sortHabits(tied, "count", "asc")), ["e", "m", "z"]);
  });

  it("handles every key without throwing on an empty table", () => {
    const keys: HabitSortKey[] = ["area", "count", "interval", "first", "last"];
    for (const key of keys) {
      assert.deepEqual(sortHabits([], key, "asc"), []);
    }
  });
});

describe("pageCount", () => {
  it("is one for an empty table, so there is a page 1 to be on", () => {
    assert.equal(pageCount(0), 1);
  });

  it("rounds up a part-full last page", () => {
    assert.equal(pageCount(1), 1);
    assert.equal(pageCount(HABITS_PER_PAGE), 1);
    assert.equal(pageCount(HABITS_PER_PAGE + 1), 2);
    assert.equal(pageCount(HABITS_PER_PAGE * 3), 3);
  });
});

describe("pageOf", () => {
  const rows = Array.from({ length: 23 }, (_, i) => i);

  it("slices in page-sized runs", () => {
    assert.deepEqual(pageOf(rows, 1, 10), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    assert.deepEqual(pageOf(rows, 2, 10), [10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
    assert.deepEqual(pageOf(rows, 3, 10), [20, 21, 22]);
  });

  it("clamps a page past the end to the last one", () => {
    // What happens when you filter to one area while on page 3: the rows are
    // still there, so show the last page rather than an empty table.
    assert.deepEqual(pageOf(rows, 9, 10), [20, 21, 22]);
  });

  it("clamps a page below one", () => {
    assert.deepEqual(pageOf(rows, 0, 10), pageOf(rows, 1, 10));
    assert.deepEqual(pageOf(rows, -4, 10), pageOf(rows, 1, 10));
  });

  it("is empty only when the rows are", () => {
    assert.deepEqual(pageOf([], 1, 10), []);
    assert.deepEqual(pageOf([], 5, 10), []);
  });

  it("covers every row exactly once across its pages", () => {
    const seen: number[] = [];
    for (let page = 1; page <= pageCount(rows.length, 10); page++) {
      seen.push(...pageOf(rows, page, 10));
    }
    assert.deepEqual(seen, rows);
  });
});
