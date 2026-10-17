import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatDateNumeric, formatMonthTitle } from "./dates.ts";

describe("formatDateNumeric", () => {
  it("writes month/day/year without padding", () => {
    assert.equal(formatDateNumeric(new Date(2026, 9, 15)), "10/15/2026");
    assert.equal(formatDateNumeric(new Date(2026, 0, 5)), "1/5/2026");
  });
});

describe("formatMonthTitle", () => {
  it("drops the year in the current year", () => {
    assert.equal(formatMonthTitle(new Date(2026, 9, 1), new Date(2026, 9, 17)), "October");
    assert.equal(formatMonthTitle(new Date(2025, 11, 1), new Date(2026, 0, 3)), "December 2025");
  });
});
