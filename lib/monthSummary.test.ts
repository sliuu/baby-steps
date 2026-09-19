import assert from "node:assert/strict";
import { describe, it } from "node:test";

// Relative, with the extension. Same rule as every other test in here: Node
// strips the types and resolves the path itself, so `@/lib/monthSummary` — a
// bundler alias, in a process with no bundler — would resolve to nothing.
// `monthSummary.ts` imports only types for the same reason.
import { cadence, elapsedDays, monthSummary } from "./monthSummary.ts";
import type { DayString } from "./dates.ts";
import type { ActivitySticker, StickersByDay } from "./stickers.ts";

/** September 2026, the month the rest of this file counts over. */
const SEPTEMBER: DayString[] = Array.from(
  { length: 30 },
  (_, i) => `2026-09-${String(i + 1).padStart(2, "0")}` as DayString,
);

/** A placement. Only the four fields the summary actually reads. */
function sticker(activityId: string, colorKey = "red"): ActivitySticker {
  return {
    id: `${activityId}-placement`,
    activityId,
    name: activityId,
    mark: "icon:dumbbell",
    colorKey,
  };
}

/** Days to the activities on them, with the mood and note nobody here reads. */
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
    // The server and the hydrating browser. September has thirty days and the
    // honest answer before the clock arrives is all of them.
    assert.equal(elapsedDays(SEPTEMBER, null), 30);
  });

  it("counts up to and including today", () => {
    assert.equal(elapsedDays(SEPTEMBER, "2026-09-16"), 16);
  });

  it("counts the whole month once it is past", () => {
    assert.equal(elapsedDays(SEPTEMBER, "2026-11-02"), 30);
  });

  it("counts nothing when the month has not started", () => {
    // Arrowing forward into next month. Nothing in it has happened, so no
    // cadence can be claimed about it — see the guard in `cadence`.
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
    // Two a day is 0.5, which rounds to zero, and "about every 0 days" is not
    // a sentence.
    assert.equal(cadence(28, 14), "about every day");
  });

  it("rounds rather than floors", () => {
    // 13 / 5 is 2.6. A floor would claim every two days, which overstates
    // somebody's own habit back at them.
    assert.equal(cadence(5, 13), "about every 3 days");
    assert.equal(cadence(6, 13), "about every 2 days");
  });

  it("says nothing when there is nothing to say", () => {
    assert.equal(cadence(0, 30), "");
    assert.equal(cadence(3, 0), "");
  });
});

describe("monthSummary", () => {
  const areaOf = new Map([
    ["gym", "Body"],
    ["read", "Mind"],
    ["journal", "Mind"],
  ]);

  it("is all zeroes for an empty month", () => {
    const summary = monthSummary(SEPTEMBER, days({}), areaOf, "2026-09-16");

    assert.deepEqual(summary, {
      daysMarked: 0,
      stickers: 0,
      areas: 0,
      elapsed: 16,
      leaders: [],
    });
  });

  it("counts days marked and stickers separately", () => {
    // Three stickers over two days. The two figures are different questions
    // and the summary shows both, which is the whole reason they are counted
    // apart.
    const summary = monthSummary(
      SEPTEMBER,
      days({
        "2026-09-01": [sticker("gym"), sticker("read")],
        "2026-09-02": [sticker("gym")],
      }),
      areaOf,
      "2026-09-16",
    );

    assert.equal(summary.daysMarked, 2);
    assert.equal(summary.stickers, 3);
  });

  it("ignores days that are not the month's own", () => {
    // The grid shows up to eleven days of the neighbours. The summary is
    // handed the month's own days, so a sticker on 31 August is invisible.
    const summary = monthSummary(
      SEPTEMBER,
      days({
        "2026-08-31": [sticker("gym")],
        "2026-10-01": [sticker("gym")],
        "2026-09-03": [sticker("gym")],
      }),
      areaOf,
      "2026-09-16",
    );

    assert.equal(summary.daysMarked, 1);
    assert.equal(summary.stickers, 1);
  });

  it("counts areas through the library, not through the hue", () => {
    // Two habits in Mind and one in Body is two areas, even though the three
    // placements carry three different hues.
    const summary = monthSummary(
      SEPTEMBER,
      days({
        "2026-09-01": [sticker("gym", "red"), sticker("read", "blue")],
        "2026-09-02": [sticker("journal", "green")],
      }),
      areaOf,
      "2026-09-16",
    );

    assert.equal(summary.areas, 2);
  });

  it("falls back to the hue for a habit the library has lost", () => {
    // Deleted, or simply not loaded. Two unknown habits sharing a hue are one
    // area; a third in a hue of its own is a second.
    const summary = monthSummary(
      SEPTEMBER,
      days({
        "2026-09-01": [sticker("ghost", "purple"), sticker("spectre", "purple")],
        "2026-09-02": [sticker("wraith", "yellow")],
      }),
      new Map(),
      "2026-09-16",
    );

    assert.equal(summary.areas, 2);
  });

  it("ranks leaders by count, then by name", () => {
    const summary = monthSummary(
      SEPTEMBER,
      days({
        "2026-09-01": [sticker("read"), sticker("journal"), sticker("gym")],
        "2026-09-02": [sticker("journal"), sticker("gym")],
        "2026-09-03": [sticker("gym")],
      }),
      areaOf,
      "2026-09-16",
    );

    // gym 3, journal 2, read 1 — and journal beats read on count, not on the
    // order the month was filled in.
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
      // Placed in reverse alphabetical order on purpose: without the tiebreak
      // this comes back as read, journal, gym.
      days({
        "2026-09-01": [sticker("read"), sticker("journal"), sticker("gym")],
      }),
      areaOf,
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
    // Eight of the sixteen days that have happened: about every two.
    const marked: Record<string, ActivitySticker[]> = {};
    for (let day = 1; day <= 16; day += 2) {
      marked[`2026-09-${String(day).padStart(2, "0")}`] = [sticker("gym")];
    }

    const summary = monthSummary(SEPTEMBER, days(marked), areaOf, "2026-09-16");

    assert.equal(summary.elapsed, 16);
    assert.equal(summary.leaders[0].count, 8);
    assert.equal(summary.leaders[0].cadence, "about every 2 days");
  });

  it("carries the leader's own drawing", () => {
    // The list draws a real sticker beside each name, so the face has to come
    // through the count rather than be looked up again.
    const summary = monthSummary(
      SEPTEMBER,
      days({ "2026-09-01": [sticker("gym", "green")] }),
      areaOf,
      "2026-09-16",
    );

    assert.equal(summary.leaders[0].activityId, "gym");
    assert.equal(summary.leaders[0].mark, "icon:dumbbell");
    assert.equal(summary.leaders[0].colorKey, "green");
  });
});
