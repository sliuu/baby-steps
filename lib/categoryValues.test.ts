import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { CATEGORY_VALUE } from "./categoryValues.ts";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

function token(name: string): string | undefined {
  return css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`))?.[1];
}

describe("CATEGORY_VALUE", () => {
  for (const [key, value] of Object.entries(CATEGORY_VALUE)) {
    it(`${key} matches globals.css`, () => {
      assert.equal(token(`cat-${key}`)?.toUpperCase(), value.ink.toUpperCase());
      assert.equal(token(`cat-${key}-text`)?.toUpperCase(), value.text.toUpperCase());
    });
  }
});
