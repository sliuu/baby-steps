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

/**
 * A calendar, written the short way.
 *
 * `note` is optional here and nowhere else. Almost every test in this file is
 * about activities or moods, and spelling out `note: null` on each of the forty
 * or so days below would be forty lines of noise about a field the test isn't
 * asking anything about. The note tests pass it; the rest get the empty day's
 * value, which is what `getStickersByDay` would have handed them.
 */
type Entry = Omit<DayStickers, "note"> & { note?: string | null };

function calendar(entries: Record<string, Entry>): StickersByDay {
  return new Map(
    Object.entries(entries).map(([day, entry]) => [
      day,
      // Filled in, not copied over. Two tests below hold onto the object they
      // passed and assert `applyChange` handed back *that* object, so an entry
      // that is already a whole `DayStickers` has to go in untouched — a spread
      // would break the identity those tests are checking, and the failure
      // would look like a bug in `applyChange` rather than in this helper.
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

  // An index arrives from a pointer over a grid, and the day underneath it can
  // have changed since the drag started — a second tab, a write rolling back.
  // Past the end has to mean the end. Negative especially matters: `splice`
  // would count backwards and put the mark second-to-last, which is a wrong
  // answer that looks deliberate.
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
    // A move is about one mark. The day it left keeps everything else it had.
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

  // The placement keeps its row id because the server keeps it too — a move is
  // an `update`, not a delete and an insert. If this ever became a rebuild,
  // React would unmount the circle and mount a different one, which is a
  // flicker in the exact frame the drop is supposed to feel continuous.
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

// A move onto the day it came from, which used to be the one thing a move
// couldn't be. The index is read against the day as it's drawn — the dragged
// mark included — because that's what the caret was sitting between when you
// let go. Every case here is really one question: does the mark end up where
// the line was?
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

  // Both carets touching a mark describe the slot it's already in, and landing
  // on one is how an abandoned drag ends. Same Map back means the cell doesn't
  // repaint at all.
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

  // The other half of a database rule: `unique (user_id, day)` on day_moods,
  // which is what makes the action's upsert a replace. A day can never hold two.
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

// A note is stored one way and typed another. The textarea's empty state is
// `""`, the column's is a row that isn't there, and `applyChange` is where the
// two are reconciled — so these tests are about that seam and not about text.
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

  // The action deletes the row for an empty note, so the map has to agree that
  // an emptied note is `null` and not `""`. If these two disagreed the day
  // would look noted until the next reload and unnoted after it.
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

// These are the ones that would catch a rewrite of `applyChange` that looks
// tidier and is wrong. Mutating the incoming Map corrupts the value React falls
// back to when a write fails, so a failed drop would roll back to the optimistic
// state instead of the real one — the sticker stays on screen forever, and it's
// gone on the next reload with nothing to explain it.
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

    // The counterpart to the no-op cases: React redraws on identity, so a real
    // change has to arrive as a different Map or nothing repaints.
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

    // Same object, not merely equal: 41 of the 42 cells should skip rendering.
    assert.equal(after.get(OTHER), untouched);
  });
});

// The regression that cost a day: an optimistic mark taking the same drag id as
// the tray row it was dragged from. dnd-kit keys its draggable map by that id,
// so when the server's real row id replaced the pending one, the mark's cleanup
// deleted the entry the tray row still needed — and that sticker could never be
// dragged again until a reload, while still looking perfectly draggable.
//
// `face` is deliberately built here the way the tray built it, as a whole
// LibrarySticker rather than a bare StickerFace. That is what made this
// invisible to TypeScript — `face` is typed `StickerFace`, which declares no
// `id`, and a value assigned from a variable gets no excess-property check — so
// a test using a clean three-field face would pass with the bug still in place.
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
