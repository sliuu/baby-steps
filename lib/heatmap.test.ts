import assert from "node:assert/strict";
import { describe, it } from "node:test";

// Relative, with the extension. Same rule as every other test in here: there is
// no bundler in this process, so `@/lib/heatmap` would resolve to nothing.
import {
  HEATMAP_DAYS,
  HEATMAP_WEEKS,
  dayWindow,
  heatLevel,
  heatmap,
  monthLabels,
} from "./heatmap.ts";
import type { LibraryGroup } from "@/lib/queries/activities";
import type { StickersByDay } from "@/lib/stickers";

/**
 * Two areas, three stickers, one of them retired.
 *
 * Walk is archived and it is the fixture's whole point: `heatmap` is supposed
 * to keep a retired habit's row *only* if it was actually done inside the
 * window, so the same library has to produce a different number of rows
 * depending on the placements. Two tests below pull in opposite directions on
 * exactly that.
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

/** Placement `id` can never equal `activityId` — the guard the other tests use. */
function days(entries: Record<string, string[]>): StickersByDay {
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

function rowFor(rows: ReturnType<typeof heatmap>, id: string) {
  const row = rows.find((r) => r.activityId === id);
  assert.ok(row, `no row for ${id}`);
  return row;
}

describe("dayWindow", () => {
  it("ends on the day it was given", () => {
    const window = dayWindow("2026-09-11", 5);
    assert.equal(window[window.length - 1], "2026-09-11");
  });

  it("runs oldest first", () => {
    assert.deepEqual(dayWindow("2026-09-11", 3), [
      "2026-09-09",
      "2026-09-10",
      "2026-09-11",
    ]);
  });

  it("is inclusive of both edges", () => {
    // Off-by-one lives here: a 365-long window ending today starts 364 days
    // ago, not 365, so it opens the day *after* the same date last year.
    // Getting it wrong shifts every month label by a column.
    assert.equal(dayWindow("2026-09-11", 365).length, 365);
    assert.equal(dayWindow("2026-09-11", 365)[0], "2025-09-12");
  });

  it("steps back over a month boundary", () => {
    assert.deepEqual(dayWindow("2026-03-02", 3), [
      "2026-02-28",
      "2026-03-01",
      "2026-03-02",
    ]);
  });

  it("steps back over a leap day", () => {
    // 2024 is a leap year, so the 1st of March is preceded by the 29th. The
    // whole reason this walks timestamps instead of doing string arithmetic.
    assert.deepEqual(dayWindow("2024-03-01", 2), ["2024-02-29", "2024-03-01"]);
  });

  it("steps back over a new year", () => {
    assert.deepEqual(dayWindow("2026-01-01", 2), ["2025-12-31", "2026-01-01"]);
  });

  it("is empty for a length of zero or less", () => {
    assert.deepEqual(dayWindow("2026-09-11", 0), []);
    assert.deepEqual(dayWindow("2026-09-11", -3), []);
  });
});

describe("monthLabels", () => {
  it("labels the column holding the first of a month", () => {
    const window = dayWindow("2026-09-11", 60);
    const [first] = monthLabels(window);

    assert.equal(window[first.index], "2026-08-01");
    assert.equal(first.label, "Aug");
  });

  it("gives January its year, because that is where the strip wraps round", () => {
    const labels = monthLabels(dayWindow("2026-02-10", 90));
    const january = labels.find((l) => l.label.startsWith("Jan"));

    assert.equal(january?.label, "Jan 26");
  });

  it("spans whole weeks, so every column is the same weekday", () => {
    // The load-bearing half of `HEATMAP_WEEKS`. Set the window to 50 days and
    // the strip still draws, but the columns drift by a day a week and a
    // weekend habit stops being a vertical stripe.
    assert.equal(HEATMAP_DAYS % 7, 0);
    assert.equal(HEATMAP_DAYS, HEATMAP_WEEKS * 7);
  });

  it("skips a month whose start is against the left edge", () => {
    // The window opens on the 2nd, so the 1st sits in column 0 of a month the
    // strip barely shows. A label there claims the strip starts on a boundary.
    const labels = monthLabels(dayWindow("2026-09-11", 41));
    assert.equal(labels[0].label, "Sep");
  });

  it("labels every month in the window exactly once", () => {
    const labels = monthLabels(dayWindow("2026-09-11", HEATMAP_DAYS));
    // Eight weeks spans two or three months, so one or two firsts fall inside
    // it — and the older one can land in the skipped left edge.
    assert.ok(labels.length >= 1 && labels.length <= 2, `${labels.length}`);
    assert.equal(new Set(labels.map((l) => l.label)).size, labels.length);
  });

  it("still labels every month exactly once over a long window", () => {
    // `HEATMAP_DAYS` shrank from 365 to 56 and `monthLabels` did not change,
    // so the rule it actually implements is worth keeping under test at the
    // length that used to exercise it. Twelve firsts fall inside a year; the
    // oldest may be inside the skipped edge, so eleven or twelve, never
    // thirteen.
    const labels = monthLabels(dayWindow("2026-09-11", 365));
    assert.ok(labels.length >= 11 && labels.length <= 12, `${labels.length}`);
    assert.equal(new Set(labels.map((l) => l.label)).size, labels.length);
  });
});

describe("heatLevel", () => {
  it("is empty at zero and below", () => {
    assert.equal(heatLevel(0), 0);
    assert.equal(heatLevel(-1), 0);
  });

  it("is one shade for once and another for more", () => {
    assert.equal(heatLevel(1), 1);
    assert.equal(heatLevel(2), 2);
  });

  it("does not keep climbing past two", () => {
    // Three steps, not five. The data has nothing to say at the fourth.
    assert.equal(heatLevel(9), 2);
  });
});

describe("heatmap · rows", () => {
  const window = dayWindow("2026-09-11", 7);

  it("gives a live sticker a row even with nothing on it", () => {
    const rows = heatmap(days({}), GROUPS, window);

    assert.deepEqual(
      rows.map((r) => r.activityId),
      ["act-gym", "act-med"],
    );
  });

  it("leaves out a retired sticker that was not done in the window", () => {
    const rows = heatmap(days({}), GROUPS, window);
    assert.equal(
      rows.some((r) => r.activityId === "act-walk"),
      false,
    );
  });

  it("keeps a retired sticker that was done in the window", () => {
    // You stopped doing the habit; you didn't stop having done it. Same
    // position `tally` takes on archived marks.
    const rows = heatmap(days({ "2026-09-08": ["act-walk"] }), GROUPS, window);

    assert.equal(rowFor(rows, "act-walk").total, 1);
  });

  it("keeps library order rather than ranking", () => {
    const rows = heatmap(
      days({ "2026-09-08": ["act-med", "act-med", "act-med"] }),
      GROUPS,
      window,
    );

    assert.deepEqual(
      rows.map((r) => r.activityId),
      ["act-gym", "act-med"],
    );
  });

  it("carries the face from the library, not from the placement", () => {
    // The builder names every placement after its own id, so a row reading
    // "Gym" can only have come from the library.
    const rows = heatmap(days({ "2026-09-08": ["act-gym"] }), GROUPS, window);
    const gym = rowFor(rows, "act-gym");

    assert.equal(gym.name, "Gym");
    assert.equal(gym.mark, "G");
    assert.equal(gym.colorKey, "green");
  });

  it("drops a mark whose activity is not in the library at all", () => {
    // The deleted-and-not-yet-refetched window. `Tally.unattributed` already
    // reports it; inventing a row here would report it twice, with no name.
    const rows = heatmap(days({ "2026-09-08": ["act-ghost"] }), GROUPS, window);

    assert.deepEqual(
      rows.map((r) => r.activityId),
      ["act-gym", "act-med"],
    );
  });
});

describe("heatmap · counts", () => {
  const window = dayWindow("2026-09-11", 7);

  it("puts a mark in the column its day occupies", () => {
    const rows = heatmap(days({ "2026-09-09": ["act-gym"] }), GROUPS, window);

    // Seven days ending on the 11th open on the 5th, so the 9th is column 4.
    assert.deepEqual(rowFor(rows, "act-gym").counts, [0, 0, 0, 0, 1, 0, 0]);
  });

  it("counts a doubled-up day twice but as one day", () => {
    const rows = heatmap(
      days({ "2026-09-11": ["act-gym", "act-gym"] }),
      GROUPS,
      window,
    );
    const gym = rowFor(rows, "act-gym");

    assert.equal(gym.counts[6], 2);
    assert.equal(gym.total, 2);
    assert.equal(gym.days, 1);
  });

  it("ignores days outside the window", () => {
    const rows = heatmap(
      days({ "2026-08-01": ["act-gym"], "2026-09-11": ["act-gym"] }),
      GROUPS,
      window,
    );
    const gym = rowFor(rows, "act-gym");

    assert.equal(gym.total, 1);
    assert.equal(gym.last, "2026-09-11");
  });

  it("reports the most recent day, not the last one it happened to read", () => {
    // Insertion order here is newest-first, so a `last` that just took the
    // final assignment would answer the 5th.
    const rows = heatmap(
      days({ "2026-09-10": ["act-gym"], "2026-09-05": ["act-gym"] }),
      GROUPS,
      window,
    );

    assert.equal(rowFor(rows, "act-gym").last, "2026-09-10");
  });

  it("is a blank row, not a missing one, for a habit never done", () => {
    const gym = rowFor(heatmap(days({}), GROUPS, window), "act-gym");

    assert.equal(gym.counts.length, 7);
    assert.deepEqual(gym.counts, [0, 0, 0, 0, 0, 0, 0]);
    assert.equal(gym.days, 0);
    assert.equal(gym.total, 0);
    assert.equal(gym.last, null);
  });

  it("gives every row exactly one slot per day in the window", () => {
    const window = dayWindow("2026-09-11", HEATMAP_DAYS);
    const rows = heatmap(days({ "2026-09-11": ["act-gym"] }), GROUPS, window);

    for (const row of rows) assert.equal(row.counts.length, HEATMAP_DAYS);
  });

  it("does not share one counts array between rows", () => {
    // `new Array(n).fill(0)` per row, not one array reused — the classic way
    // this goes wrong is every habit showing every other habit's days.
    const rows = heatmap(days({ "2026-09-11": ["act-gym"] }), GROUPS, window);

    assert.equal(rowFor(rows, "act-gym").counts[6], 1);
    assert.equal(rowFor(rows, "act-med").counts[6], 0);
  });
});
