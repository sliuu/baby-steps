import assert from "node:assert/strict";
import { describe, it } from "node:test";

// Relative, with extension (see `analytics.test.ts`).
import { polar, type Point } from "./charts.ts";
import {
  ringPoints,
  spokeAngle,
  starPoints,
  toPoints,
} from "./lifestar.ts";

/** Trig yields float dust (260.00000000000006), so compare with a tolerance. */
const CLOSE = 1e-9;

function assertClose(actual: number, expected: number, what: string) {
  assert.ok(
    Math.abs(actual - expected) < CLOSE,
    `${what}: expected ${expected}, got ${actual}`,
  );
}

function assertPoint(actual: Point, expected: Point, what: string) {
  assertClose(actual.x, expected.x, `${what} x`);
  assertClose(actual.y, expected.y, `${what} y`);
}

function distance(p: Point, cx: number, cy: number): number {
  return Math.hypot(p.x - cx, p.y - cy);
}

describe("spokeAngle", () => {
  it("puts spoke 0 straight up, whatever N is", () => {
    for (const n of [3, 4, 6, 7, 12]) {
      assertClose(spokeAngle(0, n), -Math.PI / 2, `n=${n}`);
    }
  });

  it("spaces N spokes evenly around a full turn", () => {
    const n = 7;
    for (let i = 1; i < n; i++) {
      assertClose(
        spokeAngle(i, n) - spokeAngle(i - 1, n),
        (2 * Math.PI) / n,
        `gap ${i}`,
      );
    }
  });

  it("comes back round to the start after N steps", () => {
    assertClose(spokeAngle(6, 6) - spokeAngle(0, 6), 2 * Math.PI, "full turn");
  });

  it("is 60 degrees apart for six, without anyone writing 60", () => {
    assertClose(spokeAngle(1, 6) - spokeAngle(0, 6), Math.PI / 3, "sixth turn");
  });
});

describe("ringPoints", () => {
  it("returns one point per spoke", () => {
    assert.equal(ringPoints(6, 92, 230, 142).length, 6);
    assert.equal(ringPoints(9, 92, 230, 142).length, 9);
  });

  it("puts every corner exactly on the radius", () => {
    for (const p of ringPoints(7, 92, 230, 142)) {
      assertClose(distance(p, 230, 142), 92, "corner distance");
    }
  });

  it("starts at the top", () => {
    assertPoint(ringPoints(6, 92, 230, 142)[0], { x: 230, y: 50 }, "corner 0");
  });
});

describe("starPoints", () => {
  it("takes its spoke count from the shares it is handed", () => {
    assert.equal(starPoints([1, 1, 1, 1, 1], 92, 230, 142).length, 5);
  });

  it("places each vertex at its own share of the radius", () => {
    const points = starPoints([1, 0.5, 0.25], 92, 230, 142);
    assertClose(distance(points[0], 230, 142), 92, "full");
    assertClose(distance(points[1], 230, 142), 46, "half");
    assertClose(distance(points[2], 230, 142), 23, "quarter");
  });

  it("puts a zero share exactly at the centre", () => {
    const points = starPoints([1, 0, 1], 92, 230, 142);
    assertPoint(points[1], { x: 230, y: 142 }, "zero vertex");
  });

  it("agrees with ringPoints when every share is 1", () => {
    // Maxed star must match the outer ring, or it sits off its gridline.
    const star = starPoints([1, 1, 1, 1, 1, 1], 92, 230, 142);
    const ring = ringPoints(6, 92, 230, 142);
    star.forEach((p, i) => assertPoint(p, ring[i], `vertex ${i}`));
  });
});

describe("toPoints", () => {
  it("writes the attribute SVG wants", () => {
    assert.equal(
      toPoints([
        { x: 1, y: 2 },
        { x: 3, y: 4 },
      ]),
      "1,2 3,4",
    );
  });

  it("rounds the floating-point dust out of the markup", () => {
    // `toPoints` must apply `round2` (tested in charts.test.ts).
    assert.equal(toPoints([polar(260, 150, 110, -Math.PI / 2)]), "260,40");
  });

  it("keeps two decimals of real precision", () => {
    assert.equal(toPoints([{ x: 1.234, y: 2.567 }]), "1.23,2.57");
  });

  it("is empty for an empty polygon", () => {
    assert.equal(toPoints([]), "");
  });
});
