import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildHighlight,
  dayMatches,
  sameSelection,
  type Highlight,
  type Selection,
} from "./highlight.ts";
import type { LibraryGroup } from "./queries/activities.ts";
import type { ActivitySticker, DayStickers } from "./stickers.ts";

/**
 * Two areas, three stickers. Small enough to hold in your head, and it has the
 * one shape that matters: an area with more than one sticker in it, so
 * "selecting an area" has something to collapse.
 */
const GROUPS: LibraryGroup[] = [
  {
    areaId: "area-health",
    areaName: "Health",
    colorKey: "green",
    stickers: [
      { id: "act-gym", name: "Gym", mark: "G", colorKey: "green", archived: false },
      // Retired, and still highlightable. Clicking "Health" has to light the
      // days Sleep is on — those marks are still Health's, which is the same
      // position `tally` takes about counting them.
      { id: "act-sleep", name: "Sleep", mark: "Z", colorKey: "green", archived: true },
    ],
  },
  {
    areaId: "area-spirit",
    areaName: "Spirituality",
    colorKey: "red",
    stickers: [
      { id: "act-med", name: "Meditation", mark: "🕯️", colorKey: "red", archived: false },
    ],
  },
];

/**
 * A placement, which is not the same thing as a sticker. `id` is this square of
 * this day; `activityId` is the sticker in the tray. They differ on purpose
 * here — a fixture where they matched would pass whichever one the code got
 * wrong.
 */
function placed(activityId: string, day: string): ActivitySticker {
  return {
    id: `placement-${activityId}-${day}`,
    activityId,
    name: activityId,
    mark: "•",
    colorKey: "green",
  };
}

function day(
  activities: ActivitySticker[],
  mood: DayStickers["mood"] = null,
): DayStickers {
  return { activities, mood };
}

const EMPTY_DAY = day([]);

/** Every test that needs a resolved highlight goes through the real builder. */
function highlightFor(selection: Selection): Highlight {
  const highlight = buildHighlight(selection, GROUPS);
  assert.ok(highlight, "fixture selection should resolve");
  return highlight;
}

describe("sameSelection", () => {
  it("matches two selections built separately from the same values", () => {
    assert.equal(
      sameSelection(
        { kind: "activity", activityId: "act-gym" },
        { kind: "activity", activityId: "act-gym" },
      ),
      true,
    );
  });

  it("separates the kinds even when the ids collide", () => {
    // The whole reason this isn't an id comparison: an area and an activity
    // could in principle carry the same uuid, and they'd mean different things.
    assert.equal(
      sameSelection(
        { kind: "activity", activityId: "same" },
        { kind: "area", areaId: "same" },
      ),
      false,
    );
  });

  it("distinguishes two activities", () => {
    assert.equal(
      sameSelection(
        { kind: "activity", activityId: "act-gym" },
        { kind: "activity", activityId: "act-sleep" },
      ),
      false,
    );
  });

  it("distinguishes two areas", () => {
    assert.equal(
      sameSelection(
        { kind: "area", areaId: "area-health" },
        { kind: "area", areaId: "area-spirit" },
      ),
      false,
    );
  });

  it("matches two moods, and separates two different ones", () => {
    assert.equal(
      sameSelection({ kind: "mood", mood: "rough" }, { kind: "mood", mood: "rough" }),
      true,
    );
    assert.equal(
      sameSelection({ kind: "mood", mood: "rough" }, { kind: "mood", mood: "great" }),
      false,
    );
  });

  it("treats null as matching nothing, including itself", () => {
    // "Nothing is selected" is not a selection you can click again to clear.
    assert.equal(sameSelection(null, null), false);
    assert.equal(sameSelection(null, { kind: "mood", mood: "okay" }), false);
    assert.equal(sameSelection({ kind: "mood", mood: "okay" }, null), false);
  });
});

describe("buildHighlight · an activity", () => {
  it("resolves to that one sticker, its area's colour, and its name", () => {
    const highlight = highlightFor({ kind: "activity", activityId: "act-med" });

    assert.deepEqual([...highlight.activityIds], ["act-med"]);
    assert.equal(highlight.mood, null);
    assert.equal(highlight.colorKey, "red");
    assert.equal(highlight.label, "Meditation");
  });

  it("finds a sticker in any group, not just the first", () => {
    const highlight = highlightFor({ kind: "activity", activityId: "act-sleep" });
    assert.equal(highlight.label, "Sleep");
  });

  it("is null for a sticker that isn't in the library", () => {
    // The case this really covers: you had a sticker selected and it was
    // archived. The selection outlives the row, and null is "nothing is lit".
    assert.equal(
      buildHighlight({ kind: "activity", activityId: "act-gone" }, GROUPS),
      null,
    );
  });
});

describe("buildHighlight · an area", () => {
  it("collapses to every sticker in it", () => {
    const highlight = highlightFor({ kind: "area", areaId: "area-health" });

    assert.deepEqual([...highlight.activityIds].sort(), ["act-gym", "act-sleep"]);
    assert.equal(highlight.colorKey, "green");
    assert.equal(highlight.label, "Health");
  });

  it("comes out the same shape as an activity, so nothing downstream branches", () => {
    const area = highlightFor({ kind: "area", areaId: "area-spirit" });
    const activity = highlightFor({ kind: "activity", activityId: "act-med" });

    assert.deepEqual([...area.activityIds], [...activity.activityIds]);
    assert.equal(area.mood, activity.mood);
  });

  it("resolves an area with no stickers to an empty set rather than null", () => {
    // An empty area exists and is selectable — it just lights no days. That's
    // different from an area that doesn't exist.
    const empty: LibraryGroup = {
      areaId: "area-empty",
      areaName: "Career",
      colorKey: "blue",
      stickers: [],
    };
    const highlight = buildHighlight(
      { kind: "area", areaId: "area-empty" },
      [...GROUPS, empty],
    );

    assert.ok(highlight);
    assert.equal(highlight.activityIds.size, 0);
    assert.equal(highlight.label, "Career");
  });

  it("is null for an area that isn't in the library", () => {
    assert.equal(buildHighlight({ kind: "area", areaId: "nope" }, GROUPS), null);
  });
});

describe("buildHighlight · a mood", () => {
  it("carries the mood, no activities, and no colour", () => {
    const highlight = highlightFor({ kind: "mood", mood: "rough" });

    assert.equal(highlight.mood, "rough");
    assert.equal(highlight.activityIds.size, 0);
    // Null rather than a ramp key: a mood is drawn in plain ink everywhere else
    // in the app, so lighting its days in red would invent a colour for it.
    assert.equal(highlight.colorKey, null);
    assert.equal(highlight.label, "Rough");
  });

  it("resolves without consulting the library at all", () => {
    const highlight = buildHighlight({ kind: "mood", mood: "great" }, []);
    assert.ok(highlight);
    assert.equal(highlight.label, "Great");
  });
});

describe("dayMatches · an activity", () => {
  const highlight = highlightFor({ kind: "activity", activityId: "act-gym" });

  it("lights a day carrying that sticker", () => {
    assert.equal(dayMatches(highlight, day([placed("act-gym", "2026-08-11")])), true);
  });

  it("matches on activityId, not on the placement id", () => {
    // The same sticker on two days is two placements with two ids. Matching on
    // `id` would light nothing at all, and this is the test that says so.
    const monday = day([placed("act-gym", "2026-08-10")]);
    const tuesday = day([placed("act-gym", "2026-08-11")]);

    assert.notEqual(monday.activities[0].id, tuesday.activities[0].id);
    assert.equal(dayMatches(highlight, monday), true);
    assert.equal(dayMatches(highlight, tuesday), true);
  });

  it("lights a busy day as long as one sticker matches", () => {
    const busy = day([
      placed("act-sleep", "2026-08-11"),
      placed("act-med", "2026-08-11"),
      placed("act-gym", "2026-08-11"),
    ]);
    assert.equal(dayMatches(highlight, busy), true);
  });

  it("leaves a day carrying only other stickers alone", () => {
    assert.equal(dayMatches(highlight, day([placed("act-med", "2026-08-11")])), false);
  });

  it("leaves an empty day alone", () => {
    assert.equal(dayMatches(highlight, EMPTY_DAY), false);
  });

  it("ignores the day's mood entirely", () => {
    assert.equal(dayMatches(highlight, day([], "great")), false);
  });
});

describe("dayMatches · an area", () => {
  const highlight = highlightFor({ kind: "area", areaId: "area-health" });

  it("lights a day carrying any sticker from it", () => {
    assert.equal(dayMatches(highlight, day([placed("act-sleep", "2026-08-11")])), true);
    assert.equal(dayMatches(highlight, day([placed("act-gym", "2026-08-11")])), true);
  });

  it("leaves a day carrying only another area's stickers alone", () => {
    assert.equal(dayMatches(highlight, day([placed("act-med", "2026-08-11")])), false);
  });
});

describe("dayMatches · a mood", () => {
  const highlight = highlightFor({ kind: "mood", mood: "rough" });

  it("lights a day with that mood", () => {
    assert.equal(dayMatches(highlight, day([], "rough")), true);
  });

  it("leaves a day with a different mood alone", () => {
    assert.equal(dayMatches(highlight, day([], "great")), false);
  });

  it("leaves a day with no mood alone", () => {
    assert.equal(dayMatches(highlight, EMPTY_DAY), false);
  });

  it("ignores the day's stickers entirely", () => {
    // A mood selection asks one question. A day full of stickers and no mood is
    // not a match, however busy it is.
    const busy = day([placed("act-gym", "2026-08-11"), placed("act-med", "2026-08-11")]);
    assert.equal(dayMatches(highlight, busy), false);
    assert.equal(dayMatches(highlight, { ...busy, mood: "rough" }), true);
  });
});
