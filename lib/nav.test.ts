import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { navItemFor, pageFromHash } from "./nav.ts";

describe("pageFromHash", () => {
  it("recognizes app section fragments", () => {
    assert.equal(pageFromHash("#week"), "week");
    assert.equal(pageFromHash("trends"), "trends");
  });

  it("ignores unknown or empty fragments", () => {
    assert.equal(pageFromHash("#settings"), null);
    assert.equal(pageFromHash(""), null);
  });
});

describe("navItemFor", () => {
  it("lands on today before anything is pressed", () => {
    assert.equal(navItemFor(null), "today");
  });

  it("files week and month under calendar", () => {
    assert.equal(navItemFor("week"), "calendar");
    assert.equal(navItemFor("month"), "calendar");
    assert.equal(navItemFor("trends"), "trends");
  });
});
