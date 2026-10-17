// `npm test`: Node runner, relative ".ts" imports, no `@/`.
// Each case notes what `.length` says. Characters escaped: some are invisible.
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { firstGrapheme, graphemeCount } from "./graphemes.ts";

/** 🏋️ — weightlifter + U+FE0F. */
const LIFTER = "\u{1F3CB}️";
/** 🎯 — one code point, two UTF-16 units. */
const TARGET = "\u{1F3AF}";
/** 👨‍👩‍👧 — three people, two ZWJs. */
const FAMILY = "\u{1F468}‍\u{1F469}‍\u{1F467}";
/** 🇯🇵 — two regional indicators. */
const FLAG = "\u{1F1EF}\u{1F1F5}";
/** é — decomposed: "e" + combining acute. */
const ACCENTED_E = "é";

describe("graphemeCount · plain text", () => {
  it("is zero for the empty string", () => {
    assert.equal(graphemeCount(""), 0);
  });

  it("agrees with .length on ASCII", () => {
    assert.equal(graphemeCount("A"), 1);
    assert.equal(graphemeCount("Gym"), 3);
  });
});

describe("graphemeCount · the cases .length gets wrong", () => {
  it("counts an emoji with a variation selector as one", () => {
    assert.equal(LIFTER.length, 3);
    assert.equal(graphemeCount(LIFTER), 1);
  });

  it("counts a plain astral emoji as one", () => {
    // Surrogate pair.
    assert.equal(TARGET.length, 2);
    assert.equal(graphemeCount(TARGET), 1);
  });

  it("counts a zero-width-joiner sequence as one", () => {
    assert.equal(FAMILY.length, 8);
    assert.equal(graphemeCount(FAMILY), 1);
  });

  it("counts a flag as one", () => {
    assert.equal(FLAG.length, 4);
    assert.equal(graphemeCount(FLAG), 1);
  });

  it("counts a base letter plus a combining accent as one", () => {
    // Mac option-e, e: looks like "é", twice as long to `.length`.
    assert.equal(ACCENTED_E.length, 2);
    assert.equal(graphemeCount(ACCENTED_E), 1);
  });

  it("still counts two separate emoji as two", () => {
    // Two astral emoji must not pass as one.
    assert.equal(graphemeCount(LIFTER + TARGET), 2);
  });
});

describe("firstGrapheme", () => {
  it("is empty for the empty string", () => {
    assert.equal(firstGrapheme(""), "");
  });

  it("takes a whole emoji, not half of one", () => {
    // `[0]` would be a lone high surrogate.
    assert.equal(firstGrapheme(LIFTER + "xyz"), LIFTER);
  });

  it("takes a letter with its accent", () => {
    assert.equal(firstGrapheme(ACCENTED_E + "cole"), ACCENTED_E);
  });
});
