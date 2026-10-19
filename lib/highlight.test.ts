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

/** Two categories, three stickers; Health has two to collapse. */
const GROUPS: LibraryGroup[] = [
  {
    categoryId: "category-health",
    categoryName: "Health",
    colorKey: "green",
    stickers: [
      { id: "act-gym", name: "Gym", mark: "G", colorKey: "green", archived: false },
      // Retired but still lights Health's days.
      { id: "act-sleep", name: "Sleep", mark: "Z", colorKey: "green", archived: true },
    ],
  },
  {
    categoryId: "category-spirit",
    categoryName: "Spirituality",
    colorKey: "red",
    stickers: [
      { id: "act-med", name: "Meditation", mark: "🕯️", colorKey: "red", archived: false },
    ],
  },
];

/** Placement `id` differs from `activityId` on purpose. */
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
  return { activities, mood, note: null };
}

const EMPTY_DAY = day([]);

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
    // Not an id compare: a category and activity could share a uuid.
    assert.equal(
      sameSelection(
        { kind: "activity", activityId: "same" },
        { kind: "category", categoryId: "same" },
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

  it("distinguishes two categories", () => {
    assert.equal(
      sameSelection(
        { kind: "category", categoryId: "category-health" },
        { kind: "category", categoryId: "category-spirit" },
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
    // Nothing selected isn't a selection to toggle off.
    assert.equal(sameSelection(null, null), false);
    assert.equal(sameSelection(null, { kind: "mood", mood: "okay" }), false);
    assert.equal(sameSelection({ kind: "mood", mood: "okay" }, null), false);
  });
});

describe("buildHighlight · an activity", () => {
  it("resolves to that one sticker, its category's colour, and its name", () => {
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
    // Selection outlives an archived row; null = nothing lit.
    assert.equal(
      buildHighlight({ kind: "activity", activityId: "act-gone" }, GROUPS),
      null,
    );
  });
});

describe("buildHighlight · a category", () => {
  it("collapses to every sticker in it", () => {
    const highlight = highlightFor({ kind: "category", categoryId: "category-health" });

    assert.deepEqual([...highlight.activityIds].sort(), ["act-gym", "act-sleep"]);
    assert.equal(highlight.colorKey, "green");
    assert.equal(highlight.label, "Health");
  });

  it("comes out the same shape as an activity, so nothing downstream branches", () => {
    const category = highlightFor({ kind: "category", categoryId: "category-spirit" });
    const activity = highlightFor({ kind: "activity", activityId: "act-med" });

    assert.deepEqual([...category.activityIds], [...activity.activityIds]);
    assert.equal(category.mood, activity.mood);
  });

  it("resolves a category with no stickers to an empty set rather than null", () => {
    // Empty but existing category: selectable, lights nothing.
    const empty: LibraryGroup = {
      categoryId: "category-empty",
      categoryName: "Career",
      colorKey: "blue",
      stickers: [],
    };
    const highlight = buildHighlight(
      { kind: "category", categoryId: "category-empty" },
      [...GROUPS, empty],
    );

    assert.ok(highlight);
    assert.equal(highlight.activityIds.size, 0);
    assert.equal(highlight.label, "Career");
  });

  it("is null for a category that isn't in the library", () => {
    assert.equal(buildHighlight({ kind: "category", categoryId: "nope" }, GROUPS), null);
  });
});

describe("buildHighlight · a mood", () => {
  it("carries the mood, no activities, and no colour", () => {
    const highlight = highlightFor({ kind: "mood", mood: "rough" });

    assert.equal(highlight.mood, "rough");
    assert.equal(highlight.activityIds.size, 0);
    // Moods are plain ink; don't invent a colour.
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
    // Two placements, two ids: matching on `id` lights nothing.
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

describe("dayMatches · a category", () => {
  const highlight = highlightFor({ kind: "category", categoryId: "category-health" });

  it("lights a day carrying any sticker from it", () => {
    assert.equal(dayMatches(highlight, day([placed("act-sleep", "2026-08-11")])), true);
    assert.equal(dayMatches(highlight, day([placed("act-gym", "2026-08-11")])), true);
  });

  it("leaves a day carrying only another category's stickers alone", () => {
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
    // Mood selection: stickers alone don't match.
    const busy = day([placed("act-gym", "2026-08-11"), placed("act-med", "2026-08-11")]);
    assert.equal(dayMatches(highlight, busy), false);
    assert.equal(dayMatches(highlight, { ...busy, mood: "rough" }), true);
  });
});
