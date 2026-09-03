// Run with `npm test`. Node's own test runner — `node:test` and `node:assert`
// are built in, so this adds no dependency, no config file, and no transform
// step. Node strips the types itself, which is also why the import below needs
// the real ".ts" on the end and why nothing here may import a `@/` path: that
// alias is a bundler's idea, and there is no bundler in this process.
//
// What's worth testing is `applyChange`, and only `applyChange`. It is the one
// piece of Step 9 that holds a *second copy* of a rule the database also
// enforces — a mood replaces, a duplicate activity is a no-op — and a second
// copy of a rule is the thing that silently drifts. Everything around it either
// belongs to a library (Radix's focus trap, React's `useOptimistic`) or is a
// call to Postgres, which a unit test can only fake and therefore can only lie
// about.
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { applyChange } from "./changes.ts";
import type { DayStickers, StickersByDay } from "./stickers.ts";

const GYM = { name: "Gym", mark: "G", colorKey: "blue" };
const READ = { name: "Reading", mark: "R", colorKey: "green" };

const DAY = "2026-08-20";
const OTHER = "2026-08-21";

/** A placed sticker, as `getStickersByDay` would have returned it. */
function placed(activityId: string, face: typeof GYM) {
  return { id: `row-${activityId}`, activityId, ...face };
}

function calendar(entries: Record<string, DayStickers>): StickersByDay {
  return new Map(Object.entries(entries));
}

describe("applyChange · place", () => {
  it("adds the sticker to a day that has nothing on it", () => {
    const before = calendar({});
    const after = applyChange(before, {
      kind: "place",
      day: DAY,
      activityId: "gym",
      face: GYM,
    });

    assert.deepEqual(
      after.get(DAY)?.activities.map((s) => s.activityId),
      ["gym"],
    );
    // The day didn't exist a moment ago, so its mood has to be spelled out
    // rather than left undefined — `DayStickers` says a day always has both.
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
    });

    assert.equal(after.get(DAY)?.mood, "great");
    assert.deepEqual(
      after.get(DAY)?.activities.map((s) => s.activityId),
      ["read", "gym"],
    );
  });

  // The database rule this mirrors: `unique (user_id, day, activity_id)`, which
  // the action leans on with `ignoreDuplicates`. If this branch ever drops out,
  // a second drop draws a duplicate circle and the refresh silently removes it —
  // a flicker with no error, which is the hardest kind of bug to be told about.
  it("changes nothing when that activity is already on the day", () => {
    const before = calendar({
      [DAY]: { activities: [placed("gym", GYM)], mood: null },
    });
    const after = applyChange(before, {
      kind: "place",
      day: DAY,
      activityId: "gym",
      face: GYM,
    });

    assert.equal(after, before, "expected the very same Map back, not a copy");
  });

  it("gives the pending sticker an id that can't collide with a real row", () => {
    const after = applyChange(calendar({}), {
      kind: "place",
      day: DAY,
      activityId: "gym",
      face: GYM,
    });

    // React needs a key now; the server's real row id arrives a moment later.
    // Only requirement is that it's unique among the day's own stickers.
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

    // The mood is still there. A day is two independent things, and unticking
    // an activity must not take the mood with it.
    assert.deepEqual(after.get(DAY), { activities: [], mood: "great" });
  });
});

describe("applyChange · move", () => {
  it("carries the mark to the other day", () => {
    const before = calendar({
      [DAY]: { activities: [placed("gym", GYM), placed("read", READ)], mood: "okay" },
    });
    const after = applyChange(before, {
      kind: "move",
      from: DAY,
      to: OTHER,
      activityId: "gym",
      face: GYM,
    });

    assert.deepEqual(
      after.get(DAY)?.activities.map((s) => s.activityId),
      ["read"],
    );
    assert.deepEqual(
      after.get(OTHER)?.activities.map((s) => s.activityId),
      ["gym"],
    );
    // A move is about one mark. The day it left keeps everything else it had.
    assert.equal(after.get(DAY)?.mood, "okay");
  });

  // The placement keeps its row id because the server keeps it too — a move is
  // an `update`, not a delete and an insert. If this ever became a rebuild,
  // React would unmount the circle and mount a different one, which is a
  // flicker in the exact frame the drop is supposed to feel continuous.
  it("keeps the placement's id rather than minting a pending one", () => {
    const after = applyChange(
      calendar({ [DAY]: { activities: [placed("gym", GYM)], mood: null } }),
      { kind: "move", from: DAY, to: OTHER, activityId: "gym", face: GYM },
    );

    assert.equal(after.get(OTHER)?.activities[0].id, "row-gym");
  });

  it("lands on a day that has never been drawn before", () => {
    const after = applyChange(
      calendar({ [DAY]: { activities: [placed("gym", GYM)], mood: null } }),
      { kind: "move", from: DAY, to: OTHER, activityId: "gym", face: GYM },
    );

    assert.equal(after.get(OTHER)?.mood, null);
  });

  // `unique (user_id, day, activity_id)` again, one day over: the target can't
  // hold two, so the honest answer is that the source loses its mark and the
  // target keeps the one it already had.
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
    });

    assert.deepEqual(after.get(DAY)?.activities, []);
    assert.equal(after.get(OTHER)?.activities.length, 1);
  });

  it("changes nothing when the mark is dropped back where it started", () => {
    const before = calendar({
      [DAY]: { activities: [placed("gym", GYM)], mood: null },
    });

    assert.equal(
      applyChange(before, {
        kind: "move",
        from: DAY,
        to: DAY,
        activityId: "gym",
        face: GYM,
      }),
      before,
    );
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

    assert.deepEqual(after.get(DAY), { activities: [], mood: "great" });
  });

  // The other half of a database rule: `unique (user_id, day)` on day_moods,
  // which is what makes the action's upsert a replace. A day can never hold two.
  it("replaces the mood already there instead of adding one", () => {
    const before = calendar({
      [DAY]: { activities: [placed("gym", GYM)], mood: "great" },
    });
    const after = applyChange(before, { kind: "mood", day: DAY, mood: "rough" });

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
    });
  });

  it("changes nothing when the day has no mood to clear", () => {
    const before = calendar({
      [DAY]: { activities: [placed("gym", GYM)], mood: null },
    });

    assert.equal(applyChange(before, { kind: "clearMood", day: DAY }), before);
  });
});

// These are the ones that would catch a rewrite of `applyChange` that looks
// tidier and is wrong. Mutating the incoming Map corrupts the value React falls
// back to when a write fails, so a failed drop would roll back to the optimistic
// state instead of the real one — the sticker stays on screen forever, and it's
// gone on the next reload with nothing to explain it.
describe("applyChange · doesn't touch what it was given", () => {
  it("leaves the original Map and its arrays alone", () => {
    const day: DayStickers = { activities: [placed("read", READ)], mood: null };
    const before = calendar({ [DAY]: day });

    applyChange(before, {
      kind: "place",
      day: DAY,
      activityId: "gym",
      face: GYM,
    });
    applyChange(before, { kind: "mood", day: DAY, mood: "great" });
    applyChange(before, { kind: "remove", day: DAY, activityId: "read" });
    applyChange(before, {
      kind: "move",
      from: DAY,
      to: OTHER,
      activityId: "read",
      face: READ,
    });

    assert.equal(before.get(DAY), day, "the day object was swapped in place");
    assert.equal(day.activities.length, 1, "the array was pushed to");
    assert.equal(day.mood, null, "the mood was assigned to");
  });

  it("returns a new Map when something really did change", () => {
    const before = calendar({ [DAY]: { activities: [], mood: null } });
    const after = applyChange(before, { kind: "mood", day: DAY, mood: "okay" });

    // The counterpart to the no-op cases: React redraws on identity, so a real
    // change has to arrive as a different Map or nothing repaints.
    assert.notEqual(after, before);
  });

  it("doesn't disturb other days", () => {
    const untouched: DayStickers = { activities: [], mood: "great" };
    const before = calendar({
      [DAY]: { activities: [], mood: null },
      [OTHER]: untouched,
    });
    const after = applyChange(before, {
      kind: "place",
      day: DAY,
      activityId: "gym",
      face: GYM,
    });

    // Same object, not merely equal: 41 of the 42 cells should skip rendering.
    assert.equal(after.get(OTHER), untouched);
  });
});
