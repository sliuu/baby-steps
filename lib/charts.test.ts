import assert from "node:assert/strict";
import { describe, it } from "node:test";

// Relative with extension; see `analytics.test.ts`.
import {
  LABEL_GAP,
  LINE,
  VIEW,
  labelAnchor,
  labelBaseline,
  normalize,
  polar,
  round2,
  type Point,
} from "./charts.ts";
import { spokeAngle } from "./lifestar.ts";

/** Trig results are inexact doubles, so coordinates compare with a tolerance. */
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

describe("round2", () => {
  it("keeps two decimals of real precision", () => {
    assert.equal(round2(1.234), 1.23);
    assert.equal(round2(2.567), 2.57);
  });

  it("strips the floating-point dust off a coordinate", () => {
    assert.equal(round2(260.00000000000006), 260);
  });

  it("does not round a decimal .005 tie up, and that is fine here", () => {
    // Known trade: `1.005 * 100` is 100.4999…, so it rounds down. Sub-pixel.
    assert.equal(round2(1.005), 1);
  });
});

describe("polar", () => {
  it("puts a point at the top directly above the centre", () => {
    assertPoint(
      polar(260, 150, 110, -Math.PI / 2),
      { x: 260, y: 40 },
      "top point",
    );
  });

  it("treats angle 0 as east, not north", () => {
    assertPoint(polar(0, 0, 10, 0), { x: 10, y: 0 }, "angle 0");
  });

  it("sweeps clockwise, because SVG's y grows downward", () => {
    // Quarter turn from east is below centre on screen; hence -π/2 in spokeAngle.
    assertPoint(polar(0, 0, 10, Math.PI / 2), { x: 0, y: 10 }, "quarter turn");
  });

  it("collapses to the centre at radius 0", () => {
    assertPoint(polar(260, 150, 0, 1.234), { x: 260, y: 150 }, "zero radius");
  });
});

describe("normalize", () => {
  it("scales against the largest count, not the total", () => {
    // Normalized to the max, not the total.
    assert.deepEqual(normalize([10, 6, 4]), [1, 0.6, 0.4]);
  });

  it("draws an even shape when every category is equal", () => {
    assert.deepEqual(normalize([7, 7, 7, 7]), [1, 1, 1, 1]);
  });

  it("gives the same shape for the same proportions at any size", () => {
    // Known cost of max-normalizing: same balance, same picture.
    assert.deepEqual(normalize([2, 1]), normalize([200, 100]));
  });

  it("returns zeros rather than NaN when everything is zero", () => {
    const shares = normalize([0, 0, 0]);
    assert.deepEqual(shares, [0, 0, 0]);
    // `0/0` is NaN, and deepEqual treats NaN as equal to NaN.
    assert.ok(shares.every(Number.isFinite), "every share is a real number");
  });

  it("survives an empty array", () => {
    // `Math.max()` of nothing is -Infinity; an empty list must not throw.
    assert.deepEqual(normalize([]), []);
  });

  it("puts a zero category at the far end while others are drawn", () => {
    assert.deepEqual(normalize([4, 0, 2]), [1, 0, 0.5]);
  });
});

describe("labelAnchor", () => {
  it("centres the label at the top", () => {
    // cos(-π/2) is 6.12e-17 > 0, so a bare `cos > 0` would anchor to `start`.
    assert.equal(labelAnchor(spokeAngle(0, 6)), "middle");
  });

  it("centres the label at the bottom", () => {
    assert.equal(labelAnchor(spokeAngle(3, 6)), "middle");
  });

  it("grows right-hand labels rightward and left-hand ones leftward", () => {
    assert.equal(labelAnchor(spokeAngle(1, 6)), "start");
    assert.equal(labelAnchor(spokeAngle(2, 6)), "start");
    assert.equal(labelAnchor(spokeAngle(4, 6)), "end");
    assert.equal(labelAnchor(spokeAngle(5, 6)), "end");
  });

  it("is symmetric across a whole turn", () => {
    const anchors = Array.from({ length: 6 }, (_, i) =>
      labelAnchor(spokeAngle(i, 6)),
    );
    assert.equal(anchors.filter((a) => a === "middle").length, 2);
    assert.equal(anchors.filter((a) => a === "start").length, 2);
    assert.equal(anchors.filter((a) => a === "end").length, 2);
  });

  it("handles four points, two of them exactly horizontal", () => {
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
    // Even at 30°: a vertical nudge would leave them off their point.
    for (const i of [1, 2, 4, 5]) {
      assert.equal(labelBaseline(spokeAngle(i, 6)), "middle", `spoke ${i}`);
    }
  });

  it("asks a different question from labelAnchor", () => {
    // Vertical-axis check, not side: four-point horizontals are `middle` here.
    const angle = spokeAngle(1, 4);
    assert.equal(labelBaseline(angle), "middle");
    assert.equal(labelAnchor(angle), "start");
  });
});

describe("VIEW", () => {
  it("is wide enough for the widest labels the box was budgeted for", () => {
    // Clipped labels fail silently. "Romance & Adventure": 19 chars × 12 × ~0.45em.
    const textWidth = 19 * 12 * 0.45;
    // No cosine: the donut had exactly horizontal labels; box fits the worse case.
    const needed = 2 * (VIEW.radius + LABEL_GAP) + 2 * textWidth;
    assert.ok(
      VIEW.width >= needed,
      `width ${VIEW.width} is under the ${Math.ceil(needed)} the labels need`,
    );
  });

  it("centres the drawing in its own box", () => {
    // Off-centre rings clip one side.
    assert.equal(VIEW.cx, VIEW.width / 2);
    assert.equal(VIEW.cy, VIEW.height / 2);
  });

  it("leaves room above and below for a two-line label", () => {
    // Still budgeted for the donut's two lines so the card height holds.
    assert.ok(VIEW.cy >= VIEW.radius + LABEL_GAP + 2 * LINE, "vertical room");
  });
});
