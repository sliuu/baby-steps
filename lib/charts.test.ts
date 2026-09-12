import assert from "node:assert/strict";
import { describe, it } from "node:test";

// Relative, with the extension — see the note in `analytics.test.ts`.
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

/**
 * Nothing in this file can use `assert.equal` on a coordinate.
 *
 * Every number here comes out of `Math.cos` or `Math.sin`, and those return the
 * nearest representable double rather than the answer — a point at the top of a
 * circle has an x of `260.00000000000006` and a cosine of `6.12e-17` rather
 * than `0`. Asserting exact equality would fail on correct code, and the usual
 * fix — rounding inside the function until the test passes — would be the test
 * dictating the implementation. So the tolerance lives here, where it belongs.
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

describe("round2", () => {
  it("keeps two decimals of real precision", () => {
    assert.equal(round2(1.234), 1.23);
    assert.equal(round2(2.567), 2.57);
  });

  it("strips the floating-point dust off a coordinate", () => {
    assert.equal(round2(260.00000000000006), 260);
  });

  it("does not round a decimal .005 tie up, and that is fine here", () => {
    // Pinned rather than fixed. `1.005 * 100` is 100.49999999999999 in binary,
    // so `Math.round` takes it *down* — the number written as "1.005" is not
    // quite 1.005 to begin with. Every accurate-rounding fix costs real
    // complexity, and the quantity being rounded is a hundredth of one viewBox
    // unit out of 520: far below a pixel. Worth a test so the next person meets
    // it as a known trade rather than a bug.
    assert.equal(round2(1.005), 1);
  });
});

describe("polar", () => {
  it("puts a point at the top directly above the centre", () => {
    // The worked example from the doc comment, pinned.
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
    // A quarter turn on from east is *below* the centre on screen. This is the
    // fact that makes the -π/2 in spokeAngle point up rather than down.
    assertPoint(polar(0, 0, 10, Math.PI / 2), { x: 0, y: 10 }, "quarter turn");
  });

  it("collapses to the centre at radius 0", () => {
    assertPoint(polar(260, 150, 0, 1.234), { x: 260, y: 150 }, "zero radius");
  });
});

describe("normalize", () => {
  it("scales against the largest count, not the total", () => {
    // Total would make these 0.5 / 0.3 / 0.2. The largest is what pins the
    // busiest area to the full extent.
    assert.deepEqual(normalize([10, 6, 4]), [1, 0.6, 0.4]);
  });

  it("draws an even shape when every area is equal", () => {
    assert.deepEqual(normalize([7, 7, 7, 7]), [1, 1, 1, 1]);
  });

  it("gives the same shape for the same proportions at any size", () => {
    // The stated cost of normalizing to the max, pinned so it can't drift into
    // being a surprise: a small month and a big one with the same balance are
    // the same picture.
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
    // -0. There are no zero-area users, but a chart that throws on an empty
    // list is a chart that throws during a migration.
    assert.deepEqual(normalize([]), []);
  });

  it("puts a zero area at the far end while others are drawn", () => {
    assert.deepEqual(normalize([4, 0, 2]), [1, 0, 0.5]);
  });
});

describe("labelAnchor", () => {
  it("centres the label at the top", () => {
    // The floating-point trap in one case: cos(-π/2) is 6.12e-17, which is
    // greater than zero, so a bare `cos > 0` anchors this one to `start` and
    // hangs the name off to the right of a point that is on neither side.
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
    // Including the ones at 30°, which are high enough that nudging them
    // vertically would leave them visibly off the point they name.
    for (const i of [1, 2, 4, 5]) {
      assert.equal(labelBaseline(spokeAngle(i, 6)), "middle", `spoke ${i}`);
    }
  });

  it("asks a different question from labelAnchor", () => {
    // Both read the cosine. This one asks "is it on the vertical axis", the
    // other asks "which side of it" — so the horizontal points of a four-point
    // chart are `middle` here and `start`/`end` there.
    const angle = spokeAngle(1, 4);
    assert.equal(labelBaseline(angle), "middle");
    assert.equal(labelAnchor(angle), "start");
  });
});

describe("VIEW", () => {
  it("is wide enough for the widest labels the box was budgeted for", () => {
    // The budget from VIEW's doc comment, checked rather than trusted, because
    // the failure mode is a name with its last few letters sliced off at the
    // viewBox edge and nothing anywhere reports it.
    //
    // The estimate: "Romance & Adventure" is 19 characters at 12 units, and EB
    // Garamond averages ~0.45em.
    const textWidth = 19 * 12 * 0.45;
    // No cosine, and that's the point. The star's six labels come off at 30°
    // from horizontal and are pulled in by cos(30°); the donut's sit at its
    // slice middles, two of which are exactly horizontal. The shared box has to
    // satisfy the worse of the two.
    const needed = 2 * (VIEW.radius + LABEL_GAP) + 2 * textWidth;
    assert.ok(
      VIEW.width >= needed,
      `width ${VIEW.width} is under the ${Math.ceil(needed)} the labels need`,
    );
  });

  it("centres the drawing in its own box", () => {
    // The star's rings and the donut's ring are both drawn around this centre,
    // and an off-centre one clips on one side while leaving a gap on the other.
    assert.equal(VIEW.cx, VIEW.width / 2);
    assert.equal(VIEW.cy, VIEW.height / 2);
  });

  it("leaves room above and below for a two-line label", () => {
    // Two lines because the donut stacked a percentage under each name, and the
    // box is deliberately still budgeted for that even though the donut is
    // gone: the star's card would otherwise change height for no reason. See
    // the note at the top of `charts.ts`.
    assert.ok(VIEW.cy >= VIEW.radius + LABEL_GAP + 2 * LINE, "vertical room");
  });
});
