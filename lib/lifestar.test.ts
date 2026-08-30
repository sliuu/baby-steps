import assert from "node:assert/strict";
import { describe, it } from "node:test";

// Relative, with the extension — see the note in `analytics.test.ts`.
import {
  labelAnchor,
  labelBaseline,
  normalize,
  polar,
  ringPoints,
  spokeAngle,
  starPoints,
  toPoints,
  type Point,
} from "./lifestar.ts";

/**
 * Nothing in this file can use `assert.equal` on a coordinate.
 *
 * Every number here comes out of `Math.cos` or `Math.sin`, and those return the
 * nearest representable double rather than the answer — the top vertex's x is
 * `230.00000000000003` and its cosine is `6.12e-17` rather than `0`. Asserting
 * exact equality would fail on correct code, and the usual fix (rounding inside
 * the function to make the test pass) would be the test dictating the
 * implementation. So the tolerance lives here, where it belongs.
 */
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

/** Distance from a centre — used to check a radius survived the trip. */
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

describe("polar", () => {
  it("puts the top vertex directly above the centre", () => {
    // The worked example from the doc comment, pinned.
    assertPoint(
      polar(260, 150, 110, -Math.PI / 2),
      { x: 260, y: 40 },
      "top vertex",
    );
  });

  it("treats angle 0 as east, not north", () => {
    assertPoint(polar(0, 0, 10, 0), { x: 10, y: 0 }, "angle 0");
  });

  it("sweeps clockwise, because SVG's y grows downward", () => {
    // A quarter turn on from east is *below* the centre on screen. This is the
    // fact that makes the -π/2 in spokeAngle point up rather than down.
    assertPoint(polar(0, 0, 10, Math.PI / 2), { x: 0, y: 10 }, "quarter turn");
  });

  it("collapses to the centre at radius 0", () => {
    assertPoint(polar(230, 142, 0, 1.234), { x: 230, y: 142 }, "zero radius");
  });
});

describe("normalize", () => {
  it("scales against the largest count, not the total", () => {
    // Total would make these 0.5 / 0.3 / 0.2. The largest is what pins the
    // busiest area to the outer ring.
    assert.deepEqual(normalize([10, 6, 4]), [1, 0.6, 0.4]);
  });

  it("draws a regular polygon when every area is equal", () => {
    assert.deepEqual(normalize([7, 7, 7, 7]), [1, 1, 1, 1]);
  });

  it("gives the same shape for the same proportions at any size", () => {
    // The stated cost of normalizing to the max, pinned so it can't drift into
    // being a surprise: a small month and a big one with the same balance are
    // the same polygon.
    assert.deepEqual(normalize([2, 1]), normalize([200, 100]));
  });

  it("returns zeros rather than NaN when everything is zero", () => {
    const shares = normalize([0, 0, 0]);
    assert.deepEqual(shares, [0, 0, 0]);
    // Worth asserting separately: `0/0` is NaN, and deepEqual would not catch
    // it here because NaN is deepEqual to NaN.
    assert.ok(shares.every(Number.isFinite), "every share is a real number");
  });

  it("survives an empty array", () => {
    // `Math.max()` with no arguments is -Infinity, which would make every share
    // -0. There are no zero-area users, but a chart component that throws on an
    // empty list is a chart component that throws during a migration.
    assert.deepEqual(normalize([]), []);
  });

  it("puts a zero area at the centre while others are drawn", () => {
    assert.deepEqual(normalize([4, 0, 2]), [1, 0, 0.5]);
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
    // The outer ring and a maxed-out star have to be the same polygon, or a
    // full area would sit visibly off its own gridline.
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
    // 260.00000000000006 is what the top vertex's x actually computes to.
    assert.equal(toPoints([polar(260, 150, 110, -Math.PI / 2)]), "260,40");
  });

  it("keeps two decimals of real precision", () => {
    assert.equal(toPoints([{ x: 1.234, y: 2.567 }]), "1.23,2.57");
  });

  it("does not round a decimal .005 tie up, and that is fine here", () => {
    // Pinned rather than fixed. `1.005 * 100` is 100.49999999999999 in binary,
    // so `Math.round` takes it *down* — the number written as "1.005" is not
    // quite 1.005 to begin with. Every accurate-rounding fix for this costs
    // real complexity, and the thing being rounded is a hundredth of one
    // viewBox unit out of 460: far below a pixel on any screen, and invisible
    // in a coordinate whose only job is to be a corner of a polygon. Worth a
    // test so the next person meets it as a known trade rather than a bug.
    assert.equal(toPoints([{ x: 1.005, y: 0 }]), "1,0");
  });

  it("is empty for an empty polygon", () => {
    assert.equal(toPoints([]), "");
  });
});

describe("labelAnchor", () => {
  it("centres the label on the top spoke", () => {
    // The floating-point trap in one case: cos(-π/2) is 6.12e-17, which is
    // greater than zero, so a bare `cos > 0` anchors this one to `start` and
    // hangs the name off to the right of a spoke pointing straight up.
    assert.equal(labelAnchor(spokeAngle(0, 6)), "middle");
  });

  it("centres the label on the bottom spoke", () => {
    assert.equal(labelAnchor(spokeAngle(3, 6)), "middle");
  });

  it("grows right-hand labels rightward and left-hand ones leftward", () => {
    assert.equal(labelAnchor(spokeAngle(1, 6)), "start");
    assert.equal(labelAnchor(spokeAngle(2, 6)), "start");
    assert.equal(labelAnchor(spokeAngle(4, 6)), "end");
    assert.equal(labelAnchor(spokeAngle(5, 6)), "end");
  });

  it("is symmetric across the whole star", () => {
    const anchors = Array.from({ length: 6 }, (_, i) =>
      labelAnchor(spokeAngle(i, 6)),
    );
    assert.equal(anchors.filter((a) => a === "middle").length, 2);
    assert.equal(anchors.filter((a) => a === "start").length, 2);
    assert.equal(anchors.filter((a) => a === "end").length, 2);
  });

  it("handles a four-spoke star, where two spokes are exactly horizontal", () => {
    assert.equal(labelAnchor(spokeAngle(1, 4)), "start");
    assert.equal(labelAnchor(spokeAngle(3, 4)), "end");
  });
});

describe("labelBaseline", () => {
  it("lifts the top label clear and drops the bottom one", () => {
    assert.equal(labelBaseline(spokeAngle(0, 6)), "auto");
    assert.equal(labelBaseline(spokeAngle(3, 6)), "hanging");
  });

  it("centres every label that is off the vertical axis", () => {
    // Including the ones at 30°, which are high enough that nudging them
    // vertically would leave them visibly off their own spoke.
    for (const i of [1, 2, 4, 5]) {
      assert.equal(labelBaseline(spokeAngle(i, 6)), "middle", `spoke ${i}`);
    }
  });

  it("asks a different question from labelAnchor", () => {
    // Both read the cosine. This one asks "is it on the vertical axis", the
    // other asks "which side of it" — so the horizontal spokes of a four-star
    // are `middle` here and `start`/`end` there.
    const angle = spokeAngle(1, 4);
    assert.equal(labelBaseline(angle), "middle");
    assert.equal(labelAnchor(angle), "start");
  });
});
