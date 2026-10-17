import assert from "node:assert/strict";
import { describe, it } from "node:test";

// Relative with extension: no `@/` alias under Node.
import {
  MS_PER_DAY,
  addDays,
  dayToUTC,
  daysBetween,
  startOfWeek,
  utcToDay,
  weekday,
} from "./daymath.ts";

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
    // 2024 leap, 2026 not: why the math goes through `Date.UTC`.
    assert.equal(addDays("2024-02-28", 1), "2024-02-29");
    assert.equal(addDays("2024-02-29", 1), "2024-03-01");
    assert.equal(addDays("2026-02-28", 1), "2026-03-01");
  });

  it("goes back a rolling year, which is what the strip asks it for", () => {
    // `dayWindow(end, 365)` reaches this far back on its first iteration.
    assert.equal(addDays("2026-09-11", -364), "2025-09-12");
  });

  it("steps across the spring DST boundary without losing a day", () => {
    // US spring-forward: a 23-hour local day; UTC has none.
    assert.equal(addDays("2026-03-07", 1), "2026-03-08");
    assert.equal(addDays("2026-03-08", 1), "2026-03-09");
    // …and the 25-hour autumn day.
    assert.equal(addDays("2026-11-01", 1), "2026-11-02");
  });
});

describe("daysBetween", () => {
  it("counts forward, and is zero for the same day", () => {
    assert.equal(daysBetween("2026-09-11", "2026-09-18"), 7);
    assert.equal(daysBetween("2026-09-11", "2026-09-11"), 0);
  });

  it("is negative when the pair is the other way round", () => {
    // Clamping to zero would hide a mis-sorted series.
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

describe("weekday", () => {
  it("numbers the week from Sunday", () => {
    // 2026-09-06 is a Sunday; all seven slots checked.
    const week = ["2026-09-06", "2026-09-07", "2026-09-08", "2026-09-09",
      "2026-09-10", "2026-09-11", "2026-09-12"];
    assert.deepEqual(week.map(weekday), [0, 1, 2, 3, 4, 5, 6]);
  });

  it("is the same number wherever the machine is", () => {
    // Guards `getDay` vs `getUTCDay`: west of UTC weeks would start Saturday.
    assert.equal(weekday("1970-01-01"), 4); // A Thursday, famously.
  });
});

describe("startOfWeek", () => {
  it("walks back to Sunday from anywhere in the week", () => {
    for (const day of ["2026-09-06", "2026-09-09", "2026-09-12"]) {
      assert.equal(startOfWeek(day), "2026-09-06");
    }
  });

  it("leaves a Sunday where it is", () => {
    assert.equal(startOfWeek("2026-09-06"), "2026-09-06");
  });

  it("crosses a month end", () => {
    // 2026-09-01 is a Tuesday, so its week started in August.
    assert.equal(startOfWeek("2026-09-01"), "2026-08-30");
  });

  it("crosses a year end", () => {
    // 2027-01-01 is a Friday.
    assert.equal(startOfWeek("2027-01-01"), "2026-12-27");
  });

  it("never moves a day more than six squares", () => {
    for (let i = 0; i < 400; i++) {
      const day = addDays("2026-01-01", i);
      const back = daysBetween(startOfWeek(day), day);
      assert.ok(back >= 0 && back <= 6, `${day} moved ${back}`);
    }
  });
});
