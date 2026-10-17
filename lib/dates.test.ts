import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatDateNumeric } from "./dates.ts";

describe("formatDateNumeric", () => {
  it("writes month/day/year without padding", () => {
    assert.equal(formatDateNumeric(new Date(2026, 9, 15)), "10/15/2026");
    assert.equal(formatDateNumeric(new Date(2026, 0, 5)), "1/5/2026");
  });
});
