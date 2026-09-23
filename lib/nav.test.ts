import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { pageFromHash } from "./nav.ts";

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
