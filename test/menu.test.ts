import assert from "node:assert/strict";
import test from "node:test";
import { menuLabels, resolveMenuAction } from "../src/telegram/menu";

test("main sources button opens source root menu", () => {
  assert.deepEqual(resolveMenuAction(menuLabels.sourcesRoot), {
    kind: "screen",
    value: "sourcesRoot"
  });
});

test("add URL source button starts URL intake instruction state", () => {
  assert.deepEqual(resolveMenuAction(menuLabels.addUrlSource), {
    kind: "instruction",
    value: "add_url_source"
  });
});

test("profile button opens profile root menu", () => {
  assert.deepEqual(resolveMenuAction(menuLabels.profile), {
    kind: "screen",
    value: "profileRoot"
  });
});
