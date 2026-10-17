// Run with `npm test`.
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { validateDraft } from "./stickers.ts";
import { SUGGESTIONS, suggestionsFor } from "./suggestions.ts";

const names = (list: { name: string }[]) => list.map((s) => s.name);

describe("suggestionsFor", () => {
  it("returns the whole list when nothing is owned", () => {
    assert.deepEqual(suggestionsFor("exercise", []), SUGGESTIONS.exercise);
  });

  it("drops owned names, ignoring case and spaces", () => {
    const left = names(suggestionsFor("exercise", ["  GYM ", "Run"]));
    assert.ok(!left.includes("gym"));
    assert.ok(!left.includes("run"));
    assert.equal(left.length, SUGGESTIONS.exercise.length - 2);
  });

  it("ignores names from nowhere in the list", () => {
    assert.deepEqual(suggestionsFor("work", ["pottery"]), SUGGESTIONS.work);
  });

  it("gives an unknown slug nothing", () => {
    assert.deepEqual(suggestionsFor("gardening", []), []);
    assert.deepEqual(suggestionsFor("toString", []), []);
  });
});

describe("SUGGESTIONS", () => {
  for (const [slug, list] of Object.entries(SUGGESTIONS)) {
    it(`${slug}: every entry passes the sticker validator`, () => {
      for (const s of list) {
        const check = validateDraft({ name: s.name, mark: s.mark, categoryId: "c" });
        assert.equal(check.ok, true, `${s.name} / ${s.mark}`);
      }
    });

    it(`${slug}: no duplicate names`, () => {
      const keys = list.map((s) => s.name.toLowerCase());
      assert.equal(new Set(keys).size, keys.length);
    });
  }
});
