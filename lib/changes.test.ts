// `npm test`: Node runner, relative ".ts" imports, no `@/`.
// Tests `applyChange` only: it duplicates DB rules, which can drift.
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { applyChange } from "./changes.ts";
import type { DayStickers, StickerFace, StickersByDay } from "./stickers.ts";

const GYM = { name: "Gym", mark: "G", colorKey: "blue" };
const READ = { name: "Reading", mark: "R", colorKey: "green" };
const SWIM = { name: "Swimming", mark: "S", colorKey: "amber" };

const DAY = "2026-08-20";
const OTHER = "2026-08-21";

/** A placed sticker, as `getStickersByDay` would have returned it. */
function placed(activityId: string, face: typeof GYM) {
  return { id: `row-${activityId}`, activityId, ...face };
}

/** Short-form calendar; `note` optional here to cut noise. */
type Entry = Omit<DayStickers, "note"> & { note?: string | null };

function calendar(entries: Record<string, Entry>): StickersByDay {
  return new Map(
    Object.entries(entries).map(([day, entry]) => [
      day,
      // Pass whole entries through untouched: tests check object identity.
      "note" in entry ? (entry as DayStickers) : { ...entry, note: null },
    ]),
  );
}

describe("applyChange · place", () => {
  it("adds the sticker to a day that has nothing on it", () => {
    const before = calendar({});
    const after = applyChange(before, {
      kind: "place",
      day: DAY,
      activityId: "gym",
      face: GYM,
      index: 0,
    });

    assert.deepEqual(
      after.get(DAY)?.activities.map((s) => s.activityId),
      ["gym"],
    );
    // New day: mood spelled out, not undefined.
    assert.equal(after.get(DAY)?.mood, null);
  });

  it("keeps the mood and the stickers already there", () => {
    const before = calendar({
      [DAY]: { activities: [placed("read", READ)], mood: "great" },
    });
    const after = applyChange(before, {
      kind: "place",
      day: DAY,
      activityId: "gym",
      face: GYM,
      index: 1,
    });

    assert.equal(after.get(DAY)?.mood, "great");
    assert.deepEqual(
      after.get(DAY)?.activities.map((s) => s.activityId),
      ["read", "gym"],
    );
  });

  it("drops into the slot the caret was in, not onto the end", () => {
    const before = calendar({
      [DAY]: {
        activities: [placed("read", READ), placed("swim", SWIM)],
        mood: null,
      },
    });
    const after = applyChange(before, {
      kind: "place",
      day: DAY,
      activityId: "gym",
      face: GYM,
      index: 1,
    });

    assert.deepEqual(
      after.get(DAY)?.activities.map((s) => s.activityId),
      ["read", "gym", "swim"],
    );
  });

  // Stale indexes clamp to the end; negative would make `splice` count back.
  it("clamps an index that no longer fits the day", () => {
    const before = calendar({
      [DAY]: { activities: [placed("read", READ)], mood: null },
    });

    const past = applyChange(before, {
      kind: "place",
      day: DAY,
      activityId: "gym",
      face: GYM,
      index: 9,
    });
    const under = applyChange(before, {
      kind: "place",
      day: DAY,
      activityId: "swim",
      face: SWIM,
      index: -3,
    });

    assert.deepEqual(
      past.get(DAY)?.activities.map((s) => s.activityId),
      ["read", "gym"],
    );
    assert.deepEqual(
      under.get(DAY)?.activities.map((s) => s.activityId),
      ["swim", "read"],
    );
  });

  // Mirrors `unique (user_id, day, activity_id)`; else a duplicate flickers.
  it("changes nothing when that activity is already on the day", () => {
    const before = calendar({
      [DAY]: { activities: [placed("gym", GYM)], mood: null },
    });
    const after = applyChange(before, {
      kind: "place",
      day: DAY,
      activityId: "gym",
      face: GYM,
      index: 0,
    });

    assert.equal(after, before, "expected the very same Map back, not a copy");
  });

  it("gives the pending sticker an id that can't collide with a real row", () => {
    const after = applyChange(calendar({}), {
      kind: "place",
      day: DAY,
      activityId: "gym",
      face: GYM,
      index: 0,
    });

    // Temp key, unique within the day; real id arrives later.
    assert.equal(after.get(DAY)?.activities[0].id, "pending:2026-08-20:gym");
  });
});

describe("applyChange · remove", () => {
  it("takes only the named sticker off", () => {
    const before = calendar({
      [DAY]: {
        activities: [placed("gym", GYM), placed("read", READ)],
        mood: "okay",
      },
    });
    const after = applyChange(before, {
      kind: "remove",
      day: DAY,
      activityId: "gym",
    });

    assert.deepEqual(
      after.get(DAY)?.activities.map((s) => s.activityId),
      ["read"],
    );
    assert.equal(after.get(DAY)?.mood, "okay");
  });

  it("changes nothing when the sticker isn't on the day", () => {
    const before = calendar({
      [DAY]: { activities: [placed("read", READ)], mood: null },
    });
    const after = applyChange(before, {
      kind: "remove",
      day: DAY,
      activityId: "gym",
    });

    assert.equal(after, before);
  });

  it("leaves the day present but empty rather than deleting it", () => {
    const before = calendar({
      [DAY]: { activities: [placed("gym", GYM)], mood: "great" },
    });
    const after = applyChange(before, {
      kind: "remove",
      day: DAY,
      activityId: "gym",
    });

    // Unticking an activity leaves the mood.
    assert.deepEqual(after.get(DAY), {
      activities: [],
      mood: "great",
      note: null,
    });
  });
});

describe("applyChange · move", () => {
  it("carries the mark to the other day", () => {
    const before = calendar({
      [DAY]: {
        activities: [placed("gym", GYM), placed("read", READ)],
        mood: "okay",
      },
    });
    const after = applyChange(before, {
      kind: "move",
      from: DAY,
      to: OTHER,
      activityId: "gym",
      face: GYM,
      index: 0,
    });

    assert.deepEqual(
      after.get(DAY)?.activities.map((s) => s.activityId),
      ["read"],
    );
    assert.deepEqual(
      after.get(OTHER)?.activities.map((s) => s.activityId),
      ["gym"],
    );
    // The source day keeps everything else.
    assert.equal(after.get(DAY)?.mood, "okay");
  });

  it("lands in the slot it was aimed at on the other day", () => {
    const before = calendar({
      [DAY]: { activities: [placed("gym", GYM)], mood: null },
      [OTHER]: {
        activities: [placed("read", READ), placed("swim", SWIM)],
        mood: null,
      },
    });
    const after = applyChange(before, {
      kind: "move",
      from: DAY,
      to: OTHER,
      activityId: "gym",
      face: GYM,
      index: 1,
    });

    assert.deepEqual(
      after.get(OTHER)?.activities.map((s) => s.activityId),
      ["read", "gym", "swim"],
    );
  });

  // A move is an `update`, so the row id (React key) is kept: no remount flicker.
  it("keeps the placement's id rather than minting a pending one", () => {
    const after = applyChange(
      calendar({ [DAY]: { activities: [placed("gym", GYM)], mood: null } }),
      {
        kind: "move",
        from: DAY,
        to: OTHER,
        activityId: "gym",
        face: GYM,
        index: 0,
      },
    );

    assert.equal(after.get(OTHER)?.activities[0].id, "row-gym");
  });

  it("lands on a day that has never been drawn before", () => {
    const after = applyChange(
      calendar({ [DAY]: { activities: [placed("gym", GYM)], mood: null } }),
      {
        kind: "move",
        from: DAY,
        to: OTHER,
        activityId: "gym",
        face: GYM,
        index: 0,
      },
    );

    assert.equal(after.get(OTHER)?.mood, null);
  });

  // Target already has it: source loses its mark, target keeps one.
  it("merges rather than duplicating when the target already has it", () => {
    const before = calendar({
      [DAY]: { activities: [placed("gym", GYM)], mood: null },
      [OTHER]: { activities: [placed("gym", GYM)], mood: null },
    });
    const after = applyChange(before, {
      kind: "move",
      from: DAY,
      to: OTHER,
      activityId: "gym",
      face: GYM,
      index: 0,
    });

    assert.deepEqual(after.get(DAY)?.activities, []);
    assert.equal(after.get(OTHER)?.activities.length, 1);
  });

  it("changes nothing when the source doesn't have that mark", () => {
    const before = calendar({
      [DAY]: { activities: [placed("read", READ)], mood: null },
    });

    assert.equal(
      applyChange(before, {
        kind: "move",
        from: DAY,
        to: OTHER,
        activityId: "gym",
        face: GYM,
        index: 0,
      }),
      before,
    );
  });
});

// Same-day moves: the index counts the dragged mark, as the caret did.
describe("applyChange · move within a day", () => {
  const THREE = () =>
    calendar({
      [DAY]: {
        activities: [
          placed("gym", GYM),
          placed("read", READ),
          placed("swim", SWIM),
        ],
        mood: "okay",
      },
    });

  function order(byDay: StickersByDay) {
    return byDay.get(DAY)?.activities.map((s) => s.activityId);
  }

  it("carries a mark rightwards past its neighbour", () => {
    const after = applyChange(THREE(), {
      kind: "move",
      from: DAY,
      to: DAY,
      activityId: "gym",
      face: GYM,
      index: 2,
    });

    assert.deepEqual(order(after), ["read", "gym", "swim"]);
  });

  it("carries a mark leftwards to the front", () => {
    const after = applyChange(THREE(), {
      kind: "move",
      from: DAY,
      to: DAY,
      activityId: "swim",
      face: SWIM,
      index: 0,
    });

    assert.deepEqual(order(after), ["swim", "gym", "read"]);
  });

  it("carries a mark to the end", () => {
    const after = applyChange(THREE(), {
      kind: "move",
      from: DAY,
      to: DAY,
      activityId: "gym",
      face: GYM,
      index: 3,
    });

    assert.deepEqual(order(after), ["read", "swim", "gym"]);
  });

  it("keeps the placement's id, so nothing remounts", () => {
    const after = applyChange(THREE(), {
      kind: "move",
      from: DAY,
      to: DAY,
      activityId: "gym",
      face: GYM,
      index: 3,
    });

    assert.equal(after.get(DAY)?.activities[2].id, "row-gym");
    assert.equal(after.get(DAY)?.mood, "okay");
  });

  // Dropping into its own slot returns the same Map: no repaint.
  it("changes nothing when the mark is dropped back in its own slot", () => {
    const before = THREE();

    assert.equal(
      applyChange(before, {
        kind: "move",
        from: DAY,
        to: DAY,
        activityId: "read",
        face: READ,
        index: 1,
      }),
      before,
    );
    assert.equal(
      applyChange(before, {
        kind: "move",
        from: DAY,
        to: DAY,
        activityId: "read",
        face: READ,
        index: 2,
      }),
      before,
    );
  });
});

describe("applyChange · mood", () => {
  it("sets a mood on a day that had none", () => {
    const after = applyChange(calendar({}), {
      kind: "mood",
      day: DAY,
      mood: "great",
    });

    assert.deepEqual(after.get(DAY), {
      activities: [],
      mood: "great",
      note: null,
    });
  });

  // Mirrors `unique (user_id, day)` on day_moods: mood replaces.
  it("replaces the mood already there instead of adding one", () => {
    const before = calendar({
      [DAY]: { activities: [placed("gym", GYM)], mood: "great" },
    });
    const after = applyChange(before, {
      kind: "mood",
      day: DAY,
      mood: "rough",
    });

    assert.equal(after.get(DAY)?.mood, "rough");
    assert.equal(after.get(DAY)?.activities.length, 1);
  });

  it("clears the mood, keeping the day's stickers", () => {
    const before = calendar({
      [DAY]: { activities: [placed("gym", GYM)], mood: "rough" },
    });
    const after = applyChange(before, { kind: "clearMood", day: DAY });

    assert.deepEqual(after.get(DAY), {
      activities: [placed("gym", GYM)],
      mood: null,
      note: null,
    });
  });

  it("changes nothing when the day has no mood to clear", () => {
    const before = calendar({
      [DAY]: { activities: [placed("gym", GYM)], mood: null },
    });

    assert.equal(applyChange(before, { kind: "clearMood", day: DAY }), before);
  });
});

// Notes: textarea "" ↔ no row; `applyChange` reconciles them.
describe("applyChange · note", () => {
  it("writes a note onto a day", () => {
    const before = calendar({ [DAY]: { activities: [], mood: null } });
    const after = applyChange(before, {
      kind: "note",
      day: DAY,
      note: "Long walk, felt good.",
    });

    assert.equal(after.get(DAY)?.note, "Long walk, felt good.");
  });

  it("keeps the day's stickers and mood", () => {
    const before = calendar({
      [DAY]: { activities: [placed("gym", GYM)], mood: "great" },
    });
    const after = applyChange(before, { kind: "note", day: DAY, note: "Ow." });

    assert.deepEqual(after.get(DAY), {
      activities: [placed("gym", GYM)],
      mood: "great",
      note: "Ow.",
    });
  });

  // Emptied note is `null`, matching the deleted row.
  it("stores an emptied note as null", () => {
    const before = calendar({
      [DAY]: { activities: [], mood: null, note: "x" },
    });
    const after = applyChange(before, { kind: "note", day: DAY, note: "" });

    assert.equal(after.get(DAY)?.note, null);
  });

  it("treats whitespace as empty", () => {
    const before = calendar({
      [DAY]: { activities: [], mood: null, note: "x" },
    });
    const after = applyChange(before, {
      kind: "note",
      day: DAY,
      note: "   \n ",
    });

    assert.equal(after.get(DAY)?.note, null);
  });

  it("returns the same Map when the note hasn't changed", () => {
    const before = calendar({
      [DAY]: { activities: [], mood: null, note: "Same." },
    });

    assert.equal(
      applyChange(before, { kind: "note", day: DAY, note: "Same." }),
      before,
    );
  });

  it("returns the same Map when an empty note is cleared again", () => {
    const before = calendar({ [DAY]: { activities: [], mood: null } });

    assert.equal(
      applyChange(before, { kind: "note", day: DAY, note: "" }),
      before,
    );
  });

  it("notes a day that isn't in the map yet", () => {
    const after = applyChange(calendar({}), {
      kind: "note",
      day: DAY,
      note: "First thing here.",
    });

    assert.deepEqual(after.get(DAY), {
      activities: [],
      mood: null,
      note: "First thing here.",
    });
  });

  it("leaves other days alone", () => {
    const before = calendar({
      [DAY]: { activities: [], mood: null },
      [OTHER]: { activities: [placed("gym", GYM)], mood: null, note: "Kept." },
    });
    const after = applyChange(before, { kind: "note", day: DAY, note: "New." });

    assert.equal(after.get(OTHER)?.note, "Kept.");
  });
});

// Mutating the input Map would corrupt React's rollback value on failure.
describe("applyChange · doesn't touch what it was given", () => {
  it("leaves the original Map and its arrays alone", () => {
    const day: DayStickers = {
      activities: [placed("read", READ)],
      mood: null,
      note: null,
    };
    const before = calendar({ [DAY]: day });

    applyChange(before, {
      kind: "place",
      day: DAY,
      activityId: "gym",
      face: GYM,
      index: 0,
    });
    applyChange(before, { kind: "mood", day: DAY, mood: "great" });
    applyChange(before, { kind: "remove", day: DAY, activityId: "read" });
    applyChange(before, {
      kind: "move",
      from: DAY,
      to: OTHER,
      activityId: "read",
      face: READ,
      index: 0,
    });

    assert.equal(before.get(DAY), day, "the day object was swapped in place");
    assert.equal(day.activities.length, 1, "the array was pushed to");
    assert.equal(day.mood, null, "the mood was assigned to");
  });

  it("returns a new Map when something really did change", () => {
    const before = calendar({ [DAY]: { activities: [], mood: null } });
    const after = applyChange(before, { kind: "mood", day: DAY, mood: "okay" });

    // Real changes need a new Map, or nothing repaints.
    assert.notEqual(after, before);
  });

  it("doesn't disturb other days", () => {
    const untouched: DayStickers = {
      activities: [],
      mood: "great",
      note: null,
    };
    const before = calendar({
      [DAY]: { activities: [], mood: null },
      [OTHER]: untouched,
    });
    const after = applyChange(before, {
      kind: "place",
      day: DAY,
      activityId: "gym",
      face: GYM,
      index: 0,
    });

    // Same object: the other cells skip rendering.
    assert.equal(after.get(OTHER), untouched);
  });
});

// Regression: an optimistic mark reused the tray row's drag id, breaking its drag.
// `face` is a whole LibrarySticker on purpose: TS won't flag the extra `id`.
it("never gives an optimistic mark the activity's own id", () => {
  const activityId = "activity-uuid";
  const face = {
    id: activityId,
    archived: false,
    name: "Gym",
    mark: "G",
    colorKey: "green",
  };

  const next = applyChange(new Map(), {
    kind: "place",
    day: "2026-09-05",
    activityId,
    face: face as StickerFace,
    index: 0,
  });

  const [mark] = next.get("2026-09-05")!.activities;
  assert.equal(mark.activityId, activityId);
  assert.notEqual(mark.id, activityId);
  assert.equal(mark.id, `pending:2026-09-05:${activityId}`);
  // The face still has to survive the reorder, or the circle draws blank.
  assert.equal(mark.name, "Gym");
  assert.equal(mark.mark, "G");
  assert.equal(mark.colorKey, "green");
});
