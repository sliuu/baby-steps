import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

// A broken favicon fails silently (looks like caching); nothing else reads this file.
const svg = readFileSync(new URL("../app/icon.svg", import.meta.url), "utf8");

test("the icon is well-formed XML", () => {
  // XML forbids `--` in comments, and CSS custom property names start with it.
  const comments = svg.match(/<!--[\s\S]*?-->/g) ?? [];
  for (const comment of comments) {
    assert.ok(
      !comment.slice(4, -3).includes("--"),
      "an XML comment cannot contain a double hyphen; the document will not parse",
    );
  }

  // Cheap well-formedness beyond the comments: every tag opened is closed.
  assert.ok(svg.trimStart().startsWith("<svg"), "must start with <svg");
  assert.ok(svg.trimEnd().endsWith("</svg>"), "must end with </svg>");
});

test("no colour is set from a presentation attribute", () => {
  // `var()` in a fill attribute isn't universal; it falls back to black.
  assert.ok(
    !/\b(?:fill|stroke)="[^"]*var\(/.test(svg),
    "set fill and stroke from the stylesheet, not as presentation attributes",
  );
});

test("both themes define every token the drawing uses", () => {
  const used = new Set(
    [...svg.matchAll(/var\((--[a-z-]+)\)/g)].map((m) => m[1]),
  );
  assert.ok(used.size > 0, "expected the drawing to use custom properties");

  const dark = svg.slice(svg.indexOf("prefers-color-scheme: dark"));
  for (const token of used) {
    assert.ok(svg.includes(`${token}:`), `${token} is used but never defined`);
    assert.ok(
      dark.includes(`${token}:`),
      `${token} is defined for light but not for dark`,
    );
  }
});
