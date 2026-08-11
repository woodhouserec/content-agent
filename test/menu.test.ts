import assert from "node:assert/strict";
import test from "node:test";
import { buildSectionMenu, menuLabels, resolveMenuAction } from "../src/telegram/menu";

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

test("temporary sources menu keeps only direct URL workflow buttons", () => {
  const buttons = flattenKeyboard(buildSectionMenu("temporarySources"));

  assert.ok(buttons.includes(menuLabels.addUrlSource));
  assert.ok(buttons.includes(menuLabels.showSources));
  assert.ok(!buttons.includes(menuLabels.collect));
  assert.ok(!buttons.includes(menuLabels.score));
  assert.ok(!buttons.includes(menuLabels.showTopics));
  assert.ok(!buttons.includes(menuLabels.resetTopics));
});

test("permanent sources menu keeps collection and topic workflow buttons", () => {
  const buttons = flattenKeyboard(buildSectionMenu("permanentSources"));

  assert.ok(buttons.includes(menuLabels.collect));
  assert.ok(buttons.includes(menuLabels.score));
  assert.ok(!buttons.includes(menuLabels.showTopics));
  assert.ok(buttons.includes(menuLabels.resetTopics));
});

function flattenKeyboard(markup: ReturnType<typeof buildSectionMenu>): string[] {
  return markup.keyboard.flatMap((row) => row.map((button) => button.text));
}
