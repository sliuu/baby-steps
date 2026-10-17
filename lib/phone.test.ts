import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatUS, toE164 } from "./phone.ts";

describe("toE164", () => {
  it("accepts 10 digits in any format", () => {
    assert.equal(toE164("(415) 555-0123"), "+14155550123");
    assert.equal(toE164("415.555.0123"), "+14155550123");
  });
  it("accepts a leading 1", () => {
    assert.equal(toE164("+1 415 555 0123"), "+14155550123");
  });
  it("rejects anything else", () => {
    assert.equal(toE164(""), null);
    assert.equal(toE164("555-0123"), null);
    assert.equal(toE164("24155550123"), null);
  });
});

describe("formatUS", () => {
  it("round-trips", () => assert.equal(formatUS("+14155550123"), "(415) 555-0123"));
  it("leaves non-US alone", () => assert.equal(formatUS("+447700900000"), "+447700900000"));
});
