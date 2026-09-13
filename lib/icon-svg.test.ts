import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

/**
 * `app/icon.svg` is the browser tab icon, and every way it can break is silent.
 *
 * A favicon has no error surface. If the file is malformed the browser draws
 * nothing, logs nothing, and leaves whatever icon the tab had before — which
 * during development is the previous icon and so looks exactly like a caching
 * problem. It cost an afternoon once. These are the two mistakes that caused
 * it, both of which the four gates otherwise wave straight through: nothing
 * else in the toolchain reads this file.
 */
const svg = readFileSync(new URL("../app/icon.svg", import.meta.url), "utf8");

test("the icon is well-formed XML", () => {
  // Served as a file, an SVG is parsed as XML rather than HTML, and XML
  // forbids a double hyphen inside a comment. The file's prose documents CSS
  // custom properties, whose names begin with exactly that — so writing one
  // by name in the comment is the easy version of this mistake.
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
  // A custom property is substituted in a CSS declaration. Whether it is
  // substituted in a `fill="..."` presentation attribute is not something
  // every engine agrees on, and where it is not, the fill falls back to
  // black — which still renders, so nothing looks broken until you look.
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
