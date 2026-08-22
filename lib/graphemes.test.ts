// Run with `npm test`. Same rules as `changes.test.ts`: Node's own runner, the
// real ".ts" on the import, and no `@/` path anywhere in reach — that alias is
// a bundler's idea and there is no bundler in this process.
//
// Worth testing because the entire point of `graphemeCount` is that it
// disagrees with `.length`, and the only way to keep that claim honest is to
// write down the cases where they differ. Every assertion below is paired with
// what `.length` would have said, so the test doubles as the argument for the
// function existing at all.
//
// The characters are written as escapes rather than pasted in. Half of what
// makes them interesting is invisible in an editor — a variation selector, a
// zero-width joiner, a combining accent — and a test about counting characters
// should not itself be ambiguous about which characters it contains.
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { firstGrapheme, graphemeCount } from "./graphemes.ts";

/** 🏋️ — weightlifter followed by U+FE0F, which asks for the colour rendering. */
const LIFTER = "\u{1F3CB}️";
/** 🎯 — a plain astral emoji: one code point, two UTF-16 code units. */
const TARGET = "\u{1F3AF}";
/** 👨‍👩‍👧 — three people joined by two zero-width joiners. */
const FAMILY = "\u{1F468}‍\u{1F469}‍\u{1F467}";
/** 🇯🇵 — two regional indicators a font draws as one flag. */
const FLAG = "\u{1F1EF}\u{1F1F5}";
/** é — the decomposed form: "e" plus a combining acute accent. */
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
    // No selector, but still a surrogate pair — two code units, one character.
    assert.equal(TARGET.length, 2);
    assert.equal(graphemeCount(TARGET), 1);
  });

  it("counts a zero-width-joiner sequence as one", () => {
    // One family, one glyph, one character — and eight code units.
    assert.equal(FAMILY.length, 8);
    assert.equal(graphemeCount(FAMILY), 1);
  });

  it("counts a flag as one", () => {
    assert.equal(FLAG.length, 4);
    assert.equal(graphemeCount(FLAG), 1);
  });

  it("counts a base letter plus a combining accent as one", () => {
    // What a Mac produces for option-e then e. Indistinguishable on screen
    // from the single-code-point "é", and twice as long to `.length`.
    assert.equal(ACCENTED_E.length, 2);
    assert.equal(graphemeCount(ACCENTED_E), 1);
  });

  it("still counts two separate emoji as two", () => {
    // The failure mode that matters for the form: a pair of emoji must not
    // pass as one character just because each of them is astral.
    assert.equal(graphemeCount(LIFTER + TARGET), 2);
  });
});

describe("firstGrapheme", () => {
  it("is empty for the empty string", () => {
    assert.equal(firstGrapheme(""), "");
  });

  it("takes a whole emoji, not half of one", () => {
    // `(LIFTER + "xyz")[0]` is a lone high surrogate — the replacement glyph,
    // not a character. The account menu's initial had to avoid this too.
    assert.equal(firstGrapheme(LIFTER + "xyz"), LIFTER);
  });

  it("takes a letter with its accent", () => {
    assert.equal(firstGrapheme(ACCENTED_E + "cole"), ACCENTED_E);
  });
});
