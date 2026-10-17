import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { categoryColor, fromDbColorKey, wash } from "./palette.ts";

describe("fromDbColorKey", () => {
  it("maps the old hue names the database stores", () => {
    assert.deepEqual(
      ["red", "blue", "orange", "yellow", "green", "purple"].map(fromDbColorKey),
      ["oxblood", "bottle", "mustard", "rose", "sage", "plum"],
    );
  });

  it("passes new names through and falls back on unknowns", () => {
    assert.equal(fromDbColorKey("sage"), "sage");
    assert.equal(fromDbColorKey("teal"), "bottle");
  });
});

describe("categoryColor", () => {
  it("accepts old and new keys alike", () => {
    assert.equal(categoryColor("blue").ink, "bg-cat-bottle");
    assert.equal(categoryColor("bottle").ink, "bg-cat-bottle");
  });
});

describe("wash", () => {
  it("is neutral with no colour", () => {
    assert.equal(wash(null), "bg-secondary");
    assert.equal(wash("rose"), "bg-cat-rose/15");
  });
});
