// Run with `npm test`. See `changes.test.ts` for why the import carries its
// ".ts" and why nothing here may reach a `@/` path.
//
// `validateDraft` earns a suite for the Step 9 reason: it is a second copy of
// rules the database also holds, and a second copy is the thing that drifts
// silently. It also holds one rule the database *can't* — "the mark is one
// character" is uncheckable in SQL, because `length()` counts code points and
// disagrees with a person about every emoji. That rule has no backstop, so the
// only thing standing behind it is this file.
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { NAME_MAX, readDraft, validateDraft } from "./stickers.ts";

const AREA = "11111111-1111-1111-1111-111111111111";

/** A draft that passes, so each test can spoil exactly one thing. */
function draft(overrides: Partial<Parameters<typeof validateDraft>[0]> = {}) {
  return { name: "Gym", mark: "G", lifeAreaId: AREA, ...overrides };
}

describe("validateDraft · the happy path", () => {
  it("accepts a letter", () => {
    const result = validateDraft(draft());
    assert.equal(result.ok, true);
    assert.deepEqual(result.ok && result.draft, {
      name: "Gym",
      mark: "G",
      lifeAreaId: AREA,
    });
  });

  it("accepts an emoji as one character", () => {
    // The whole reason graphemeCount exists. Three code units, one mark.
    const result = validateDraft(draft({ mark: "🏋️" }));
    assert.equal(result.ok, true);
  });

  it("returns the trimmed values, not the ones it was given", () => {
    // What gets written is `result.draft`, so the trim has to travel with it —
    // "  Gym  " and "Gym" must not become two rows the unique constraint sees
    // as different names.
    const result = validateDraft(
      draft({ name: "  Gym  ", mark: " G ", lifeAreaId: ` ${AREA} ` }),
    );
    assert.equal(result.ok, true);
    assert.deepEqual(result.ok && result.draft, {
      name: "Gym",
      mark: "G",
      lifeAreaId: AREA,
    });
  });

  it("leaves the draft it was handed alone", () => {
    const input = draft({ name: "  Gym  " });
    validateDraft(input);
    assert.equal(input.name, "  Gym  ");
  });

  it("accepts a name exactly at the limit", () => {
    assert.equal(validateDraft(draft({ name: "x".repeat(NAME_MAX) })).ok, true);
  });
});

describe("validateDraft · the name", () => {
  it("rejects an empty name", () => {
    const result = validateDraft(draft({ name: "" }));
    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.field, "name");
  });

  it("rejects a name that is only spaces", () => {
    // Trim first, then decide — otherwise "   " is a perfectly good name and
    // the row that lands is an invisible sticker.
    const result = validateDraft(draft({ name: "   " }));
    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.field, "name");
  });

  it("rejects a name one character past the limit", () => {
    const result = validateDraft(draft({ name: "x".repeat(NAME_MAX + 1) }));
    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.field, "name");
  });

  it("measures the name in characters, not code units", () => {
    // NAME_MAX emoji is a long name but a legal one. Counted with `.length`
    // this would be two or three times over the limit and rejected.
    const result = validateDraft(draft({ name: "🎯".repeat(NAME_MAX) }));
    assert.equal(result.ok, true);
  });
});

describe("validateDraft · the mark", () => {
  it("rejects an empty mark", () => {
    const result = validateDraft(draft({ mark: "" }));
    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.field, "mark");
  });

  it("rejects two letters", () => {
    const result = validateDraft(draft({ mark: "Gy" }));
    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.field, "mark");
  });

  it("rejects two emoji", () => {
    // The case a code-unit count would have to guess at: this is four code
    // units, same as one flag.
    const result = validateDraft(draft({ mark: "🎯🎯" }));
    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.field, "mark");
  });
});

describe("validateDraft · the life area", () => {
  it("rejects a missing area", () => {
    // What an untouched Select sends: nothing at all.
    const result = validateDraft(draft({ lifeAreaId: "" }));
    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.field, "lifeArea");
  });

  it("does not check that the area exists", () => {
    // Deliberate, and the same reasoning as `lib/queries/`: whether an id is
    // *yours* is the composite foreign key's job, inside Postgres. A check
    // here would be a second answer to the same question, and the wrong one
    // would still typecheck.
    assert.equal(validateDraft(draft({ lifeAreaId: "not-a-uuid" })).ok, true);
  });
});

describe("readDraft", () => {
  it("pulls the three fields out of a form", () => {
    const form = new FormData();
    form.set("name", "Gym");
    form.set("mark", "G");
    form.set("lifeArea", AREA);

    assert.deepEqual(readDraft(form), {
      name: "Gym",
      mark: "G",
      lifeAreaId: AREA,
    });
  });

  it("treats missing fields as empty strings", () => {
    // So `validateDraft` only ever sees strings and the complaint is a
    // sentence rather than a crash on null.
    assert.deepEqual(readDraft(new FormData()), {
      name: "",
      mark: "",
      lifeAreaId: "",
    });
  });

  it("treats a file as absent rather than stringifying it", () => {
    const form = new FormData();
    form.set("name", new File(["x"], "name.txt"));
    assert.equal(readDraft(form).name, "");
  });
});
