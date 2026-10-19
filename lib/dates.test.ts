import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatDateNumeric, formatDateShort, formatDayHeading, formatMonthTitle } from "./dates.ts";

describe("formatDateShort", () => {
  it("abbreviates the month with a period and orders the day", () => {
    assert.equal(formatDateShort(new Date(2026, 9, 17)), "oct. 17th 2026");
    assert.equal(formatDateShort(new Date(2026, 0, 1)), "jan. 1st 2026");
    assert.equal(formatDateShort(new Date(2026, 4, 22)), "may 22nd 2026");
  });
});

describe("formatDateNumeric", () => {
  it("writes month/day/year without padding", () => {
    assert.equal(formatDateNumeric(new Date(2026, 9, 15)), "10/15/2026");
    assert.equal(formatDateNumeric(new Date(2026, 0, 5)), "1/5/2026");
  });
});

describe("formatMonthTitle", () => {
  it("always includes the year", () => {
    assert.equal(formatMonthTitle(new Date(2026, 9, 1)), "October 2026");
    assert.equal(formatMonthTitle(new Date(2025, 11, 1)), "December 2025");
  });
});

describe("formatDayHeading", () => {
  it("uses the weekday and an ordinal date", () => {
    assert.equal(formatDayHeading("2026-10-17"), "Saturday October 17th");
  });
});
