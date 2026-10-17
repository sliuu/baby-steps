import assert from "node:assert/strict";
import { describe, it } from "node:test";

// Relative, with the extension — see the note in `analytics.test.ts`.
import { balanceLevels, balanceSpread, verdict } from "./balance.ts";
import { isFlipped, itemAngle, labelArc } from "./balance-geometry.ts";

// Wed 14 Oct 2026. Sunday weeks: 11–17 Oct, 4–10 Oct, 27 Sep–3 Oct.
const today = new Date(2026, 9, 14);
const categories = [{ id: "a" }, { id: "b" }];

describe("balanceLevels", () => {
  it("is all 0 with no history", () => {
    assert.deepEqual(balanceLevels({ categories, days: [], today }), { a: 0, b: 0 });
  });

  it("counts one sticker this week as 1", () => {
    const days = [{ day: "2026-10-11", categoryIds: ["a"] }];
    assert.deepEqual(balanceLevels({ categories, days, today }), { a: 1, b: 0 });
  });

  it("counts a sticker in each of 3 weeks as 3", () => {
    const days = ["2026-10-14", "2026-10-10", "2026-09-27"].map((day) => ({
      day,
      categoryIds: ["a"],
    }));
    assert.equal(balanceLevels({ categories, days, today }).a, 3);
  });

  it("ignores stickers 4 weeks ago", () => {
    const days = [
      { day: "2026-09-26", categoryIds: ["a"] },
      { day: "2026-09-20", categoryIds: ["a"] },
    ];
    assert.equal(balanceLevels({ categories, days, today }).a, 0);
  });

  it("counts several stickers in one week once", () => {
    const days = ["2026-10-04", "2026-10-06", "2026-10-10"].map((day) => ({
      day,
      categoryIds: ["a", "a"],
    }));
    assert.equal(balanceLevels({ categories, days, today }).a, 1);
  });

  it("follows weekStartsOn", () => {
    // Monday weeks: 12–18 Oct, so Sun 11 Oct is last week.
    const days = [
      { day: "2026-10-11", categoryIds: ["a"] },
      { day: "2026-10-12", categoryIds: ["a"] },
    ];
    assert.equal(balanceLevels({ categories, days, today }).a, 1);
    assert.equal(balanceLevels({ categories, days, today, weekStartsOn: 1 }).a, 2);
  });

  it("ignores unknown categories", () => {
    const days = [{ day: "2026-10-14", categoryIds: ["zzz"] }];
    assert.deepEqual(balanceLevels({ categories, days, today }), { a: 0, b: 0 });
  });
});

describe("balanceSpread", () => {
  it("is max minus min", () => {
    assert.equal(balanceSpread({ a: 3, b: 1, c: 2 }), 2);
    assert.equal(balanceSpread({}), 0);
  });
});

describe("label arcs", () => {
  it("flips only the bottom half of six", () => {
    const flips = [0, 1, 2, 3, 4, 5].map((i) => isFlipped(itemAngle(i, 6)));
    assert.deepEqual(flips, [false, false, true, true, true, false]);
  });

  it("does not flip three and nine o'clock", () => {
    assert.equal(isFlipped(itemAngle(1, 4)), false);
    assert.equal(isFlipped(itemAngle(3, 4)), false);
  });

  it("runs left to right in both halves", () => {
    for (const i of [0, 3]) {
      const [, x0, , , , , , , , x1] = labelArc(itemAngle(i, 6), 0.5).split(" ");
      assert.ok(Number(x0) < Number(x1), `arc ${i} starts left of its end`);
    }
  });

  it("sweeps clockwise on top, anticlockwise below", () => {
    assert.match(labelArc(itemAngle(0, 6), 0.5), / 0 0 1 /);
    assert.match(labelArc(itemAngle(3, 6), 0.5), / 0 0 0 /);
  });
});

describe("verdict", () => {
  const cats = [
    { id: "a", name: "Spirituality" },
    { id: "b", name: "Exercise" },
    { id: "c", name: "Work" },
  ];
  const balanced = "looks like your pie is well balanced! let's try to keep it that way";

  it("is balanced at spread 0 or 1", () => {
    assert.equal(verdict({ a: 0, b: 0, c: 0 }, cats), balanced);
    assert.equal(verdict({ a: 1, b: 2, c: 2 }, cats), balanced);
  });
  it("names the lowest and highest, lowercase", () => {
    assert.equal(
      verdict({ a: 3, b: 0, c: 1 }, cats),
      "looks like exercise is trailing behind, but you're filling your cup with spirituality",
    );
  });
  it("breaks ties by order", () => {
    assert.equal(
      verdict({ a: 0, b: 0, c: 3 }, cats).startsWith("looks like spirituality is trailing"),
      true,
    );
    assert.match(verdict({ a: 3, b: 3, c: 0 }, cats), /cup with spirituality$/);
  });
  it("treats missing levels as 0", () => {
    assert.match(verdict({ c: 2 }, cats), /^looks like spirituality is trailing/);
  });
  it("is balanced with no categories", () => assert.equal(verdict({}, []), balanced));
});
