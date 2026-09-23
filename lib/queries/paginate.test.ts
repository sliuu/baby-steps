import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { readAllPages } from "./paginate.ts";

describe("readAllPages", () => {
  it("joins full pages and the final partial page", async () => {
    const source = [0, 1, 2, 3, 4];
    const ranges: [number, number][] = [];
    const result = await readAllPages(async (from, to) => {
      ranges.push([from, to]);
      return { data: source.slice(from, to + 1), error: null };
    }, 2);

    assert.deepEqual(result.data, source);
    assert.deepEqual(ranges, [[0, 1], [2, 3], [4, 5]]);
  });

  it("returns an error without requesting another page", async () => {
    let calls = 0;
    const result = await readAllPages(async () => {
      calls += 1;
      return { data: null, error: { message: "nope" } };
    }, 2);

    assert.equal(result.error?.message, "nope");
    assert.equal(calls, 1);
  });
});
