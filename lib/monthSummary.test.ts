import assert from "node:assert/strict";
import { describe, it } from "node:test";

// Relative with extension: no `@/` alias under Node.
import { cadence, elapsedDays, monthSummary } from "./monthSummary.ts";
import type { DayString } from "./dates.ts";
import type { ActivitySticker, StickersByDay } from "./stickers.ts";

/** September 2026. */
const SEPTEMBER: DayString[] = Array.from(
  { length: 30 },
  (_, i) => `2026-09-${String(i + 1).padStart(2, "0")}` as DayString,
);

/** Only the four fields the summary reads. */
function sticker(activityId: string, colorKey = "red"): ActivitySticker {
  return {
    id: `${activityId}-placement`,
    activityId,
    name: activityId,
    mark: "icon:dumbbell",
    colorKey,
  };
}

function days(entries: Record<string, ActivitySticker[]>): StickersByDay {
  return new Map(
    Object.entries(entries).map(([day, activities]) => [
      day as DayString,
      { activities, mood: null, note: null },
    ]),
  );
}

describe("elapsedDays", () => {
  it("counts the whole month when there is no today", () => {
    // Before the clock arrives (SSR/hydration), all thirty days count.
    assert.equal(elapsedDays(SEPTEMBER, null), 30);
  });

  it("counts up to and including today", () => {
    assert.equal(elapsedDays(SEPTEMBER, "2026-09-16"), 16);
  });

  it("counts the whole month once it is past", () => {
    assert.equal(elapsedDays(SEPTEMBER, "2026-11-02"), 30);
  });

  it("counts nothing when the month has not started", () => {
    // Next month hasn't happened, so no cadence.
    assert.equal(elapsedDays(SEPTEMBER, "2026-08-31"), 0);
  });

  it("counts the first day on the first day", () => {
    assert.equal(elapsedDays(SEPTEMBER, "2026-09-01"), 1);
  });
});

describe("cadence", () => {
  it("says every day when the count matches the days", () => {
    assert.equal(cadence(14, 14), "about every day");
  });

  it("floors at a day when something happened more than once a day", () => {
    // 0.5 rounds to zero; "about every 0 days" isn't a sentence.
    assert.equal(cadence(28, 14), "about every day");
  });

  it("rounds rather than floors", () => {
    // 13 / 5 = 2.6; a floor would overstate the habit.
    assert.equal(cadence(5, 13), "about every 3 days");
    assert.equal(cadence(6, 13), "about every 2 days");
  });

  it("says nothing when there is nothing to say", () => {
    assert.equal(cadence(0, 30), "");
    assert.equal(cadence(3, 0), "");
  });
});

describe("monthSummary", () => {
  const categoryOf = new Map([
    ["gym", "Body"],
    ["read", "Mind"],
    ["journal", "Mind"],
  ]);

  it("is all zeroes for an empty month", () => {
    const summary = monthSummary(SEPTEMBER, days({}), categoryOf, "2026-09-16");

    assert.deepEqual(summary, {
      daysMarked: 0,
      stickers: 0,
      categories: 0,
      elapsed: 16,
      leaders: [],
    });
  });

  it("counts days marked and stickers separately", () => {
    // Stickers and days are counted apart.
    const summary = monthSummary(
      SEPTEMBER,
      days({
        "2026-09-01": [sticker("gym"), sticker("read")],
        "2026-09-02": [sticker("gym")],
      }),
      categoryOf,
      "2026-09-16",
    );

    assert.equal(summary.daysMarked, 2);
    assert.equal(summary.stickers, 3);
  });

  it("ignores days that are not the month's own", () => {
    // Only the month's own days; 31 August is invisible.
    const summary = monthSummary(
      SEPTEMBER,
      days({
        "2026-08-31": [sticker("gym")],
        "2026-10-01": [sticker("gym")],
        "2026-09-03": [sticker("gym")],
      }),
      categoryOf,
      "2026-09-16",
    );

    assert.equal(summary.daysMarked, 1);
    assert.equal(summary.stickers, 1);
  });

  it("counts categories through the library, not through the hue", () => {
    // Categories count by group, not hue.
    const summary = monthSummary(
      SEPTEMBER,
      days({
        "2026-09-01": [sticker("gym", "red"), sticker("read", "blue")],
        "2026-09-02": [sticker("journal", "green")],
      }),
      categoryOf,
      "2026-09-16",
    );

    assert.equal(summary.categories, 2);
  });

  it("falls back to the hue for a habit the library has lost", () => {
    // Unknown habits group by hue.
    const summary = monthSummary(
      SEPTEMBER,
      days({
        "2026-09-01": [sticker("ghost", "purple"), sticker("spectre", "purple")],
        "2026-09-02": [sticker("wraith", "yellow")],
      }),
      new Map(),
      "2026-09-16",
    );

    assert.equal(summary.categories, 2);
  });

  it("ranks leaders by count, then by name", () => {
    const summary = monthSummary(
      SEPTEMBER,
      days({
        "2026-09-01": [sticker("read"), sticker("journal"), sticker("gym")],
        "2026-09-02": [sticker("journal"), sticker("gym")],
        "2026-09-03": [sticker("gym")],
      }),
      categoryOf,
      "2026-09-16",
    );

    // Ranked by count, not fill order.
    assert.deepEqual(
      summary.leaders.map((leader) => [leader.name, leader.count]),
      [
        ["gym", 3],
        ["journal", 2],
        ["read", 1],
      ],
    );
  });

  it("breaks a tie on the name", () => {
    const summary = monthSummary(
      SEPTEMBER,
      // Reverse alphabetical on purpose, to exercise the tiebreak.
      days({
        "2026-09-01": [sticker("read"), sticker("journal"), sticker("gym")],
      }),
      categoryOf,
      "2026-09-16",
    );

    assert.deepEqual(
      summary.leaders.map((leader) => leader.name),
      ["gym", "journal", "read"],
    );
  });

  it("keeps three leaders at most", () => {
    const summary = monthSummary(
      SEPTEMBER,
      days({
        "2026-09-01": [
          sticker("a"),
          sticker("b"),
          sticker("c"),
          sticker("d"),
          sticker("e"),
        ],
      }),
      new Map(),
      "2026-09-16",
    );

    assert.equal(summary.leaders.length, 3);
  });

  it("gives each leader a cadence over the elapsed days", () => {
    // 8 of 16 elapsed days: about every two.
    const marked: Record<string, ActivitySticker[]> = {};
    for (let day = 1; day <= 16; day += 2) {
      marked[`2026-09-${String(day).padStart(2, "0")}`] = [sticker("gym")];
    }

    const summary = monthSummary(SEPTEMBER, days(marked), categoryOf, "2026-09-16");

    assert.equal(summary.elapsed, 16);
    assert.equal(summary.leaders[0].count, 8);
    assert.equal(summary.leaders[0].cadence, "about every 2 days");
  });

  it("carries the leader's own drawing", () => {
    // The face comes through with the count.
    const summary = monthSummary(
      SEPTEMBER,
      days({ "2026-09-01": [sticker("gym", "green")] }),
      categoryOf,
      "2026-09-16",
    );

    assert.equal(summary.leaders[0].activityId, "gym");
    assert.equal(summary.leaders[0].mark, "icon:dumbbell");
    assert.equal(summary.leaders[0].colorKey, "green");
  });
});
