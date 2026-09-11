// Run with `npm test`. See `changes.test.ts` for why the import carries its
// ".ts" and why nothing here may reach a `@/` path.
//
// This suite doesn't test behaviour so much as shape, and the shape is
// load-bearing in a way that isn't obvious from either file on its own:
// `MarkPicker` draws a fixed 9 × 4 grid and pages at 36, so a group of any
// other size either leaves a hole in a tab or strands icons on a second page
// that nothing tells you is there. There is no runtime error for that — it just
// quietly looks wrong — which is exactly the kind of rule that wants a test.
//
// The id round-trip is the other half. `iconFor` is the one place a stored
// string becomes a component, and `iconMark` is its inverse; a set where those
// two disagree about any icon would show a blank circle for a mark the picker
// itself had just written.
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ALL_ICONS,
  ICON_GROUPS,
  ICON_PREFIX,
  iconFor,
  iconMark,
  isIconMark,
} from "./icons.ts";

/** The picker's page, repeated here so a change to either side breaks a test. */
const PER_TAB = 54;

describe("ICON_GROUPS · the shape the picker draws", () => {
  it("gives every group exactly one full page", () => {
    for (const group of ICON_GROUPS) {
      assert.equal(
        group.icons.length,
        PER_TAB,
        `${group.label} has ${group.icons.length} icons, not ${PER_TAB}`,
      );
    }
  });

  it("has eight groups, so the tab row fits the popover", () => {
    assert.equal(ICON_GROUPS.length, 8);
  });

  it("flattens to the total the search placeholder promises", () => {
    assert.equal(ALL_ICONS.length, ICON_GROUPS.length * PER_TAB);
  });

  it("gives every group an id and a tab icon", () => {
    for (const group of ICON_GROUPS) {
      assert.ok(group.id, `${group.label} has no id`);
      // `ok`, not `typeof === "function"`: Lucide's components come out of
      // `forwardRef`, which returns an object rather than a function.
      assert.ok(group.Tab, `${group.label} has no Tab`);
    }
  });

  it("keeps group ids unique, since they are the Radix tab values", () => {
    const ids = ICON_GROUPS.map((group) => group.id);
    assert.equal(new Set(ids).size, ids.length);
  });
});

describe("ALL_ICONS · every entry is usable", () => {
  it("has a unique id for each icon", () => {
    const ids = ALL_ICONS.map((icon) => icon.id);
    const seen = new Set(ids);
    assert.equal(seen.size, ids.length, "an id appears twice");
  });

  it("gives each icon a label, keywords and a component", () => {
    for (const icon of ALL_ICONS) {
      assert.ok(icon.label, `${icon.id} has no label`);
      assert.ok(icon.keywords, `${icon.id} has no keywords`);
      assert.ok(icon.Icon, `${icon.id} has no component`);
    }
  });

  it("uses Lucide's kebab-case for every id", () => {
    for (const icon of ALL_ICONS) {
      assert.match(icon.id, /^[a-z0-9]+(-[a-z0-9]+)*$/, icon.id);
    }
  });
});

describe("iconFor · the lookup a stored mark goes through", () => {
  it("round-trips every icon through iconMark", () => {
    for (const icon of ALL_ICONS) {
      assert.equal(iconFor(iconMark(icon.id))?.id, icon.id);
    }
  });

  it("returns null for a letter", () => {
    assert.equal(iconFor("G"), null);
  });

  it("returns null for an emoji still in the database", () => {
    assert.equal(iconFor("🏋"), null);
  });

  it("returns null for a bare id with no prefix", () => {
    assert.equal(iconFor("dumbbell"), null);
  });

  it("returns null for a prefixed id that was retired", () => {
    assert.equal(iconFor(`${ICON_PREFIX}dumbell`), null);
  });

  // The reason `BY_ID` is a Map and not an object literal: `mark` is free text
  // out of the database, and `{}["constructor"]` is a function.
  it("returns null for an inherited object property", () => {
    assert.equal(iconFor(`${ICON_PREFIX}constructor`), null);
    assert.equal(iconFor(`${ICON_PREFIX}__proto__`), null);
  });
});

describe("isIconMark · what validateDraft asks", () => {
  it("agrees with iconFor on a real icon", () => {
    assert.equal(isIconMark(`${ICON_PREFIX}dumbbell`), true);
  });

  it("agrees with iconFor on everything else", () => {
    assert.equal(isIconMark("G"), false);
    assert.equal(isIconMark(`${ICON_PREFIX}nope`), false);
  });
});
