import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { safeInternalPath } from "./redirects.ts";

describe("safeInternalPath", () => {
  it("keeps ordinary app paths, queries, and fragments", () => {
    assert.equal(safeInternalPath("/week?from=login#today"), "/week?from=login#today");
  });

  it("rejects absolute and protocol-relative destinations", () => {
    assert.equal(safeInternalPath("https://example.com"), "/");
    assert.equal(safeInternalPath("//example.com"), "/");
  });

  it("rejects backslash variants that URL parsers treat as another host", () => {
    assert.equal(safeInternalPath("/\\example.com"), "/");
  });

  it("uses the requested fallback for missing or malformed values", () => {
    assert.equal(safeInternalPath(null, "/login"), "/login");
    assert.equal(safeInternalPath("not a path", "/login"), "/login");
  });
});
