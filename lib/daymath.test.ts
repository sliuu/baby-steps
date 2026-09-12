import assert from "node:assert/strict";
import { describe, it } from "node:test";

// Relative, with the extension. Same rule as every other test in here: Node
// strips the types and resolves the path itself, so `@/lib/daymath` — a
// bundler alias, in a process with no bundler — would resolve to nothing.
import { MS_PER_DAY, addDays, dayToUTC, daysBetween, utcToDay } from "./daymath.ts";

describe("addDays", () => {
  it("steps forward and back inside a month", () => {
    assert.equal(addDays("2026-09-11", 1), "2026-09-12");
    assert.equal(addDays("2026-09-11", -1), "2026-09-10");
  });

  it("returns the same day for zero", () => {
    assert.equal(addDays("2026-09-11", 0), "2026-09-11");
  });

  it("crosses a month end in both directions", () => {
    assert.equal(addDays("2026-08-31", 1), "2026-09-01");
    assert.equal(addDays("2026-09-01", -1), "2026-08-31");
  });

  it("crosses a year end in both directions", () => {
    assert.equal(addDays("2026-12-31", 1), "2027-01-01");
    assert.equal(addDays("2027-01-01", -1), "2026-12-31");
  });

  it("knows February's length in a leap year and out of one", () => {
    // 2024 is a leap year; 2026 is not. This is the whole reason the math goes
    // through `Date.UTC` instead of arithmetic on the parts.
    assert.equal(addDays("2024-02-28", 1), "2024-02-29");
    assert.equal(addDays("2024-02-29", 1), "2024-03-01");
    assert.equal(addDays("2026-02-28", 1), "2026-03-01");
  });

  it("goes back a rolling year, which is what the strip asks it for", () => {
    // `dayWindow(end, 365)` reaches this far back on its first iteration.
    assert.equal(addDays("2026-09-11", -364), "2025-09-12");
  });

  it("steps across the spring DST boundary without losing a day", () => {
    // 8 March 2026 is a US spring-forward Sunday. In local time that day is 23
    // hours long, and day arithmetic done on local dates lands at 23:00 the
    // previous evening and rounds back a day. In UTC there is no such day.
    assert.equal(addDays("2026-03-07", 1), "2026-03-08");
    assert.equal(addDays("2026-03-08", 1), "2026-03-09");
    // …and the autumn one, where the 25-hour day skips forward instead.
    assert.equal(addDays("2026-11-01", 1), "2026-11-02");
  });
});

describe("daysBetween", () => {
  it("counts forward, and is zero for the same day", () => {
    assert.equal(daysBetween("2026-09-11", "2026-09-18"), 7);
    assert.equal(daysBetween("2026-09-11", "2026-09-11"), 0);
  });

  it("is negative when the pair is the other way round", () => {
    // Nothing in the app relies on this yet, but silently clamping to zero
    // would turn a mis-sorted series into a flat one rather than an error.
    assert.equal(daysBetween("2026-09-18", "2026-09-11"), -7);
  });

  it("counts across a leap day", () => {
    assert.equal(daysBetween("2024-02-28", "2024-03-01"), 2);
    assert.equal(daysBetween("2026-02-28", "2026-03-01"), 1);
  });

  it("counts a whole year", () => {
    assert.equal(daysBetween("2026-01-01", "2027-01-01"), 365);
    assert.equal(daysBetween("2024-01-01", "2025-01-01"), 366);
  });

  it("undoes addDays", () => {
    for (const by of [-400, -31, -1, 0, 1, 31, 400]) {
      assert.equal(daysBetween("2026-09-11", addDays("2026-09-11", by)), by);
    }
  });
});

describe("dayToUTC and utcToDay", () => {
  it("round-trip", () => {
    for (const day of ["2024-02-29", "2026-01-01", "2026-09-11", "2026-12-31"]) {
      assert.equal(utcToDay(dayToUTC(day)), day);
    }
  });

  it("lands on midnight UTC, not on some hour of the local day", () => {
    assert.equal(dayToUTC("2026-09-11") % MS_PER_DAY, 0);
  });

  it("agrees with Date.UTC on the epoch", () => {
    assert.equal(dayToUTC("1970-01-01"), 0);
    assert.equal(utcToDay(0), "1970-01-01");
  });
});
