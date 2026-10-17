// `npm test`; relative `.ts` imports only (see changes.test.ts).
// "One character" can't be checked in SQL, so this suite is its only backstop.
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { NAME_MAX, readDraft, validateDraft } from "./stickers.ts";

const CATEGORY = "11111111-1111-1111-1111-111111111111";

/** A draft that passes, so each test can spoil exactly one thing. */
function draft(overrides: Partial<Parameters<typeof validateDraft>[0]> = {}) {
  return { name: "Gym", mark: "G", categoryId: CATEGORY, ...overrides };
}

describe("validateDraft · the happy path", () => {
  it("accepts a letter", () => {
    const result = validateDraft(draft());
    assert.equal(result.ok, true);
    assert.deepEqual(result.ok && result.draft, {
      name: "Gym",
      mark: "G",
      categoryId: CATEGORY,
    });
  });

  it("accepts an emoji as one character", () => {
    // Three code units, one mark.
    const result = validateDraft(draft({ mark: "🏋️" }));
    assert.equal(result.ok, true);
  });

  it("returns the trimmed values, not the ones it was given", () => {
    // The trim must travel with the draft, or the unique constraint sees two names.
    const result = validateDraft(
      draft({ name: "  Gym  ", mark: " G ", categoryId: ` ${CATEGORY} ` }),
    );
    assert.equal(result.ok, true);
    assert.deepEqual(result.ok && result.draft, {
      name: "Gym",
      mark: "G",
      categoryId: CATEGORY,
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
    // Trim before checking, or "   " passes.
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
    // `.length` would reject this.
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
    // Four code units, same as one flag.
    const result = validateDraft(draft({ mark: "🎯🎯" }));
    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.field, "mark");
  });

  it("accepts an icon name, which is not one grapheme", () => {
    // Icon ids are many characters, one picture.
    const result = validateDraft(draft({ mark: "icon:dumbbell" }));
    assert.equal(result.ok, true);
    assert.equal(result.ok && result.draft.mark, "icon:dumbbell");
  });

  it("rejects an icon name that isn't in the set", () => {
    // Membership, not shape.
    const result = validateDraft(draft({ mark: "icon:dumbell" }));
    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.field, "mark");
  });

  it("rejects a bare icon id with no prefix", () => {
    // The prefix stops a typed word becoming a picture.
    const result = validateDraft(draft({ mark: "dumbbell" }));
    assert.equal(result.ok, false);
  });
});

describe("validateDraft · the category", () => {
  it("rejects a missing category", () => {
    // What an untouched Select sends: nothing at all.
    const result = validateDraft(draft({ categoryId: "" }));
    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.field, "category");
  });

  it("does not check that the category exists", () => {
    // Ownership is the composite FK's job in Postgres.
    assert.equal(validateDraft(draft({ categoryId: "not-a-uuid" })).ok, true);
  });
});

describe("readDraft", () => {
  it("pulls the three fields out of a form", () => {
    const form = new FormData();
    form.set("name", "Gym");
    form.set("mark", "G");
    form.set("category", CATEGORY);

    assert.deepEqual(readDraft(form), {
      name: "Gym",
      mark: "G",
      categoryId: CATEGORY,
    });
  });

  it("treats missing fields as empty strings", () => {
    // Always strings, so the complaint is a sentence, not a crash.
    assert.deepEqual(readDraft(new FormData()), {
      name: "",
      mark: "",
      categoryId: "",
    });
  });

  it("treats a file as absent rather than stringifying it", () => {
    const form = new FormData();
    form.set("name", new File(["x"], "name.txt"));
    assert.equal(readDraft(form).name, "");
  });
});
