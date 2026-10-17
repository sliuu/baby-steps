import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { addDays } from "./daymath.ts";
import {
  DEMO_CATEGORY_COUNT,
  DEMO_DAYS,
  DEMO_HABIT_COUNT,
  DEMO_PER_DAY,
  demoLibrary,
  demoStickers,
} from "./demo.ts";
import { MOODS } from "./moods.ts";
import type { DayString } from "@/lib/dates";

const TODAY = "2026-09-11" as DayString;

function placements(end: DayString) {
  let total = 0;
  for (const day of demoStickers(end).values()) total += day.activities.length;
  return total;
}

describe("demoLibrary", () => {
  it("mirrors the six seeded categories, in order", () => {
    const groups = demoLibrary();
    assert.equal(groups.length, DEMO_CATEGORY_COUNT);
    assert.deepEqual(
      groups.map((group) => group.categoryName),
      [
        "Spirituality",
        "Exercise",
        "Work",
        "Creativity & Play",
        "Romance & Adventure",
        "Friends & Family",
      ],
    );
  });

  it("puts every habit under exactly one category", () => {
    const stickers = demoLibrary().flatMap((group) => group.stickers);
    assert.equal(stickers.length, DEMO_HABIT_COUNT);
    assert.equal(new Set(stickers.map((s) => s.id)).size, DEMO_HABIT_COUNT);
  });

  it("gives every category at least one habit, so no group is empty", () => {
    for (const group of demoLibrary()) {
      assert.ok(group.stickers.length > 0, `${group.categoryName} is empty`);
    }
  });

  it("takes its colour from its category, the way the real query does", () => {
    for (const group of demoLibrary()) {
      for (const sticker of group.stickers) {
        assert.equal(sticker.colorKey, group.colorKey);
      }
    }
  });

  it("archives nothing — the tray should look like a fresh account", () => {
    const stickers = demoLibrary().flatMap((group) => group.stickers);
    assert.ok(stickers.every((sticker) => !sticker.archived));
  });

  it("uses ids no database row could collide with", () => {
    const groups = demoLibrary();
    assert.ok(groups.every((group) => group.categoryId.startsWith("demo-")));
    assert.ok(
      groups
        .flatMap((group) => group.stickers)
        .every((sticker) => sticker.id.startsWith("demo-")),
    );
  });
});

describe("demoStickers", () => {
  it("ends today and reaches back a year", () => {
    const days = [...demoStickers(TODAY).keys()].sort();
    assert.equal(days[days.length - 1], TODAY);
    assert.ok(days[0] >= addDays(TODAY, -(DEMO_DAYS - 1)));
  });

  it("never runs past today", () => {
    for (const day of demoStickers(TODAY).keys()) {
      assert.ok(day <= TODAY, `${day} is in the future`);
    }
  });

  it("averages about four placements a day", () => {
    const per = placements(TODAY) / DEMO_DAYS;
    // ±0.1 sticker; `chance`'s clamp biases slightly low (see `scale`).
    assert.ok(
      Math.abs(per - DEMO_PER_DAY) < 0.4,
      `${per.toFixed(2)} per day, wanted about ${DEMO_PER_DAY}`,
    );
  });

  it("holds that average whatever day it is generated for", () => {
    for (const end of [
      "2026-01-01",
      "2026-02-28",
      "2026-06-30",
    ] as DayString[]) {
      const per = placements(end) / DEMO_DAYS;
      assert.ok(
        Math.abs(per - DEMO_PER_DAY) < 0.4,
        `${end}: ${per.toFixed(2)}`,
      );
    }
  });

  it("spreads the year across all six categories", () => {
    const seen = new Map<string, number>();
    for (const day of demoStickers(TODAY).values()) {
      for (const sticker of day.activities) {
        seen.set(sticker.colorKey, (seen.get(sticker.colorKey) ?? 0) + 1);
      }
    }
    assert.equal(seen.size, DEMO_CATEGORY_COUNT);
    // Weights within 3:1 so the Life Star is a shape, not one spike.
    const counts = [...seen.values()];
    assert.ok(
      Math.min(...counts) > Math.max(...counts) / 3,
      `${Math.min(...counts)} to ${Math.max(...counts)} across six categories`,
    );
  });

  it("uses every habit at least once, so no strip row is blank", () => {
    const used = new Set<string>();
    for (const day of demoStickers(TODAY).values()) {
      for (const sticker of day.activities) used.add(sticker.activityId);
    }
    assert.equal(used.size, DEMO_HABIT_COUNT);
  });

  it("never places the same habit on a day twice", () => {
    for (const [day, stickers] of demoStickers(TODAY)) {
      const ids = stickers.activities.map((sticker) => sticker.activityId);
      assert.equal(new Set(ids).size, ids.length, day);
    }
  });

  it("gives every placement its own id", () => {
    const ids = [...demoStickers(TODAY).values()].flatMap((day) =>
      day.activities.map((sticker) => sticker.id),
    );
    assert.equal(new Set(ids).size, ids.length);
  });

  it("fills in most moods, but not all", () => {
    const map = demoStickers(TODAY);
    let moody = 0;
    for (const day of map.values()) if (day.mood) moody++;
    const share = moody / DEMO_DAYS;
    assert.ok(share > 0.7, `only ${(share * 100).toFixed(0)}% of days`);
    assert.ok(share < 0.95, `${(share * 100).toFixed(0)}% is all of them`);
  });

  it("uses all five moods", () => {
    const seen = new Set<string>();
    for (const day of demoStickers(TODAY).values()) {
      if (day.mood) seen.add(day.mood);
    }
    assert.equal(seen.size, MOODS.length);
  });

  it("leaves the notes empty — a demo has nobody's diary in it", () => {
    for (const day of demoStickers(TODAY).values()) {
      assert.equal(day.note, null);
    }
  });

  it("is the same year twice — the server and the browser must agree", () => {
    const a = demoStickers(TODAY);
    const b = demoStickers(TODAY);
    assert.deepEqual([...a.keys()], [...b.keys()]);
    for (const [day, stickers] of a) {
      assert.deepEqual(stickers, b.get(day));
    }
  });

  it("leans on weekdays, so the strip's columns mean something", () => {
    let weekday = 0;
    let weekend = 0;
    for (const [day, stickers] of demoStickers(TODAY)) {
      if (!stickers.activities.some((s) => s.activityId === "demo-deep-work")) {
        continue;
      }
      // UTC: a DayString is a calendar square.
      const dow = new Date(`${day}T00:00:00Z`).getUTCDay();
      if (dow === 0 || dow === 6) weekend++;
      else weekday++;
    }
    // Weekday habit: beats weekends by more than 5:2.
    assert.ok(weekday > weekend * 5, `${weekday} weekday, ${weekend} weekend`);
  });

  it("drifts across the year, so Trends has something to report", () => {
    const map = demoStickers(TODAY);
    const half = addDays(TODAY, -Math.floor(DEMO_DAYS / 2));

    let early = 0;
    let late = 0;
    for (const [day, stickers] of map) {
      const yoga = stickers.activities.some(
        (s) => s.activityId === "demo-yoga",
      );
      if (!yoga) continue;
      if (day < half) early++;
      else late++;
    }
    // Yoga fades (`fade: -1`); the decline must survive `scale`.
    assert.ok(early > late * 1.7, `${early} early, ${late} late`);
  });
});
