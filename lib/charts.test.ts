import assert from "node:assert/strict";
import { describe, it } from "node:test";

// Relative, with the extension — see the note in `analytics.test.ts`.
import {
  LABEL_GAP,
  LINE,
  TOP,
  VIEW,
  circumference,
  donutArcs,
  labelAnchor,
  labelBaseline,
  normalize,
  polar,
  round2,
  sliceMidAngles,
  stackOffset,
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

describe("circumference", () => {
  it("is 2πr", () => {
    assertClose(circumference(10), 2 * Math.PI * 10, "r=10");
  });
});

describe("donutArcs", () => {
  it("cuts the ring into segments proportional to the shares", () => {
    const arcs = donutArcs([0.5, 0.25, 0.25], 100);
    assert.equal(arcs[0].dashArray, "50 50");
    assert.equal(arcs[1].dashArray, "25 75");
    assert.equal(arcs[2].dashArray, "25 75");
  });

  it("starts each segment where the last one ended", () => {
    const arcs = donutArcs([0.5, 0.25, 0.25], 100);
    assert.equal(arcs[0].dashOffset, 0);
    assert.equal(arcs[1].dashOffset, -50);
    assert.equal(arcs[2].dashOffset, -75);
  });

  it("offsets negatively, because positive shifts the pattern backwards", () => {
    // Sign errors here draw every segment at the right size in the wrong
    // place, which looks like scrambled data rather than a bug in one number.
    const arcs = donutArcs([0.25, 0.75], 400);
    assert.ok(arcs[1].dashOffset < 0, "second segment offset is negative");
    assert.equal(arcs[1].dashOffset, -100);
  });

  it("returns +0 rather than -0 for the first segment", () => {
    // `assert.strictEqual` compares with Object.is, and Object.is(-0, 0) is
    // false — so this would otherwise need its own special assertion.
    assert.equal(Object.is(donutArcs([1], 100)[0].dashOffset, 0), true);
  });

  it("gives a zero share a zero-length dash", () => {
    // An area with no marks paints nothing and takes no room, but it still
    // occupies its index so the colours stay lined up with the areas.
    const arcs = donutArcs([0.5, 0, 0.5], 100);
    assert.equal(arcs[1].dashArray, "0 100");
    assert.equal(arcs[1].dashOffset, -50);
    assert.equal(arcs[2].dashOffset, -50);
  });

  it("paints the whole ring when the shares sum to 1", () => {
    const length = 360;
    const shares = [0.2, 0.3, 0.5];
    const arcs = donutArcs(shares, length);
    const painted = arcs.reduce(
      (sum, arc) => sum + Number(arc.dashArray.split(" ")[0]),
      0,
    );
    assertClose(painted, length, "painted length");
  });

  it("leaves the rest unpainted when the shares do not sum to 1", () => {
    // Not an error. A partial total should look partial rather than being
    // silently stretched to fill the ring.
    const arcs = donutArcs([0.25, 0.25], 100);
    assert.equal(arcs.length, 2);
    assert.equal(arcs[1].dashOffset, -25);
  });

  it("handles an empty set of shares", () => {
    assert.deepEqual(donutArcs([], 100), []);
  });

  it("uses the real circumference, not a rounded one", () => {
    // The length comes from `circumference`, so a full single share has to
    // close the ring exactly rather than leaving a hairline seam.
    const length = circumference(52);
    const [arc] = donutArcs([1], length);
    assert.equal(arc.dashArray, `${round2(length)} 0`);
  });
});

describe("sliceMidAngles", () => {
  it("points at the middle of a slice, not its edge", () => {
    // One slice covering the whole ring starts at the top and its middle is
    // straight down. An off-by-a-half-slice here labels boundaries.
    assertClose(sliceMidAngles([1])[0], TOP + Math.PI, "half turn on");
  });

  it("starts the first slice at twelve o'clock", () => {
    // A quarter-share first slice runs from the top to three o'clock, so its
    // middle is halfway between: 45° clockwise from the top.
    assertClose(sliceMidAngles([0.25])[0], TOP + Math.PI / 4, "first mid");
  });

  it("spaces equal slices evenly, like spokes", () => {
    const mids = sliceMidAngles([0.25, 0.25, 0.25, 0.25]);
    for (let i = 1; i < mids.length; i++) {
      assertClose(mids[i] - mids[i - 1], Math.PI / 2, `gap ${i}`);
    }
  });

  it("gives a zero slice the boundary between its neighbours", () => {
    // Which is exactly why `Donut` doesn't label empty areas: this angle is a
    // real number pointing at somebody else's colour.
    const mids = sliceMidAngles([0.5, 0, 0.5]);
    assertClose(mids[1], TOP + Math.PI, "zero slice");
  });

  it("keeps going past a full turn when shares overshoot", () => {
    // Nothing clamps. Shares that sum past 1 wrap around the ring, which is the
    // same thing the drawing does — the labels stay on their segments rather
    // than piling up at the end.
    const mids = sliceMidAngles([0.75, 0.75]);
    assertClose(mids[1] - mids[0], 0.75 * 2 * Math.PI, "gap");
  });

  it("handles an empty set of shares", () => {
    assert.deepEqual(sliceMidAngles([]), []);
  });
});

describe("stackOffset", () => {
  it("leaves a one-line label exactly where the baseline put it", () => {
    for (const baseline of ["auto", "middle", "hanging"] as const) {
      assert.equal(stackOffset(baseline, 1), 0, baseline);
    }
  });

  it("lifts a two-line block clear of a point it should sit above", () => {
    assert.equal(stackOffset("auto", 2), -LINE);
  });

  it("straddles a point with half the extra height", () => {
    // The one that goes wrong silently: without it every side label hangs half
    // a line below its own segment, which reads as sloppy rather than as a bug.
    assert.equal(stackOffset("middle", 2), -LINE / 2);
  });

  it("does not move a block that hangs below its point", () => {
    // The first line is already below it; the second is further below, which is
    // where it belongs.
    assert.equal(stackOffset("hanging", 2), 0);
  });

  it("scales with the number of lines", () => {
    assert.equal(stackOffset("auto", 3), -2 * LINE);
    assert.equal(stackOffset("middle", 3), -LINE);
  });
});

describe("VIEW", () => {
  it("is wide enough for the donut's labels, which reach furthest", () => {
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
    // The donut stacks a percentage under each name, so the top and bottom
    // labels are twice as tall as the star's.
    assert.ok(VIEW.cy >= VIEW.radius + LABEL_GAP + 2 * LINE, "vertical room");
  });
});
