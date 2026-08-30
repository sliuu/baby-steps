import assert from "node:assert/strict";
import { describe, it } from "node:test";

// Relative, with the extension. Node strips the types itself and resolves this
// path directly; `@/lib/analytics` would be a bundler alias with no bundler.
import {
  inBounds,
  percent,
  resolveBounds,
  tally,
  type Bounds,
} from "./analytics.ts";
import type { LibraryGroup } from "@/lib/queries/activities";
import type { StickersByDay } from "@/lib/stickers";

const TODAY = "2026-08-22";

/**
 * A library of three areas, one of them empty.
 *
 * The empty one is not padding: an area with no stickers has to survive into the
 * output as a zero row, because the Life Star in Step 13 draws a spoke per area
 * and a missing one would silently change the shape of the chart.
 */
const GROUPS: LibraryGroup[] = [
  {
    areaId: "area-health",
    areaName: "Health",
    colorKey: "green",
    stickers: [
      { id: "act-gym", name: "Gym", mark: "G", colorKey: "green" },
      { id: "act-walk", name: "Walk", mark: "W", colorKey: "green" },
    ],
  },
  {
    areaId: "area-spirit",
    areaName: "Spirituality",
    colorKey: "red",
    stickers: [{ id: "act-med", name: "Meditation", mark: "M", colorKey: "red" }],
  },
  { areaId: "area-work", areaName: "Work", colorKey: "blue", stickers: [] },
];

/**
 * Days built so that a placement's `id` can never equal its `activityId`.
 *
 * Same guard as `highlight.test.ts`: these two are both called "id" in
 * neighbouring code and mean different things, and a fixture where they matched
 * would pass whichever one the code reached for.
 */
function days(
  entries: Record<string, string[]>,
): StickersByDay {
  const map: StickersByDay = new Map();
  for (const [day, activityIds] of Object.entries(entries)) {
    map.set(day, {
      mood: null,
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
    // The bug this guards: "2026-08-9" would sort after "2026-08-10". Zero
    // padding is what makes the string comparison chronological.
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
    assert.equal(result.areas[0].count, 3); // Health has all three
  });

  it("puts each mark under its activity's area", () => {
    const result = tally(
      days({ "2026-08-10": ["act-gym", "act-med"] }),
      GROUPS,
      ALL,
    );
    assert.equal(result.areas[0].count, 1); // Health
    assert.equal(result.areas[1].count, 1); // Spirituality
  });

  it("keeps areas in the library's order, empty ones included", () => {
    const result = tally(days({ "2026-08-10": ["act-med"] }), GROUPS, ALL);
    assert.deepEqual(
      result.areas.map((area) => area.areaName),
      ["Health", "Spirituality", "Work"],
    );
    assert.equal(result.areas[2].count, 0);
  });

  it("returns every area at zero when nothing has been placed", () => {
    const result = tally(new Map(), GROUPS, ALL);
    assert.equal(result.total, 0);
    assert.equal(result.areas.length, 3);
    assert.deepEqual(
      result.areas.map((area) => area.count),
      [0, 0, 0],
    );
  });

  it("carries each area's name and colour through", () => {
    const result = tally(new Map(), GROUPS, ALL);
    assert.equal(result.areas[1].areaName, "Spirituality");
    assert.equal(result.areas[1].colorKey, "red");
    assert.equal(result.areas[1].areaId, "area-spirit");
  });

  it("ignores moods — a mood is not a mark", () => {
    const map = days({ "2026-08-10": ["act-gym"] });
    map.set("2026-08-11", { activities: [], mood: "great" });
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
    assert.equal(result.areas.length, 3);
  });
});

describe("tally · shares", () => {
  it("share is the exact fraction", () => {
    const result = tally(
      days({ "2026-08-10": ["act-gym", "act-walk", "act-med"] }),
      GROUPS,
      ALL,
    );
    assert.equal(result.areas[0].share, 2 / 3);
    assert.equal(result.areas[1].share, 1 / 3);
  });

  it("share is 0 rather than NaN when the range is empty", () => {
    const result = tally(new Map(), GROUPS, ALL);
    assert.equal(result.areas[0].share, 0);
    assert.equal(result.areas[0].percent, 0);
  });

  it("gives two areas with the same count the same percent", () => {
    // The case that decided the rounding, and the reason `percents` is gone.
    // Apportioning a leftover point has to give it to *one* of two equal rows,
    // and the table sorts by count — so the two rows it splits end up adjacent,
    // showing the same number of marks and different shares.
    const result = tally(days({ "2026-08-10": ["act-gym", "act-med"] }), GROUPS, ALL);
    assert.equal(result.areas[0].count, result.areas[1].count);
    assert.equal(result.areas[0].percent, result.areas[1].percent);
  });

  it("percents land within a rounding step of 100", () => {
    // Not *exactly* 100 — that's the price of rounding each row on its own, and
    // it's paid deliberately. One tenth per row is the most any row can be off,
    // so three areas can drift at most 0.15. The table prints the real sum.
    const result = tally(
      days({ "2026-08-10": ["act-gym", "act-walk", "act-med"] }),
      GROUPS,
      ALL,
    );
    const sum = result.areas.reduce((n, area) => n + area.percent, 0);
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
    // Still in the total: it happened. It just has nowhere to sit.
    assert.equal(result.total, 2);
    assert.equal(
      result.areas.reduce((n, area) => n + area.count, 0),
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
    // The whole point of the rewrite: this is a pure function of one count and
    // one total, so two rows with the same count cannot come out different.
    // Apportionment could not promise that — its answer for a row depended on
    // every other row in the array.
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

  it("gives a lone area the whole 100", () => {
    assert.equal(percent(5, 5), 100);
  });

  it("keeps a tiny share visible instead of rounding it away", () => {
    // 1 in 1000 is 0.1%, and at one decimal place it survives as 0.1% rather
    // than flattening to 0%. A whole-percent column couldn't show this at all —
    // a real mark would have read "0%" next to a count of 1.
    assert.equal(percent(1, 1000), 0.1);
    assert.equal(percent(999, 1000), 99.9);
  });

  it("rounds away only below a twentieth of a percent", () => {
    // Still a floor somewhere: 1 in 5000 is 0.02%, which has no room at one
    // decimal. The count column beside it says 1, so the table stays honest —
    // "0.0%" is a statement about share, not about whether it happened.
    assert.equal(percent(1, 5000), 0);
  });
});
