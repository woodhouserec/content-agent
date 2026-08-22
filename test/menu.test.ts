import assert from "node:assert/strict";
import test from "node:test";
import { buildSectionMenu, menuLabels, resolveMenuAction } from "../src/telegram/menu";
import { buildMaterialFilterMessage } from "../src/telegram/material-filter-settings";
import { buildThesisFilterMessage } from "../src/telegram/thesis-filter-settings";

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
  const markup = buildSectionMenu("permanentSources");
  const buttons = flattenKeyboard(markup);

  assert.ok(buttons.includes(menuLabels.collect));
  assert.ok(buttons.includes(menuLabels.resetMaterials));
  assert.ok(buttons.includes(menuLabels.score));
  assert.ok(!buttons.includes(menuLabels.showTopics));
  assert.ok(buttons.includes(menuLabels.resetTopics));
  assert.ok(buttons.includes(menuLabels.materialFilter));
  assert.ok(buttons.includes(menuLabels.thesisFilter));
  assert.deepEqual(markup.keyboard.map((row) => row.map((button) => button.text)), [
    [menuLabels.collect, menuLabels.resetMaterials],
    [menuLabels.score, menuLabels.resetTopics],
    [menuLabels.showSources, menuLabels.addUrlSource],
    [menuLabels.materialFilter, menuLabels.thesisFilter],
    [menuLabels.back]
  ]);
});

test("material filter menu exposes freshness controls", () => {
  const buttons = flattenKeyboard(buildSectionMenu("materialFilter"));

  assert.ok(buttons.includes(menuLabels.freshness7Days));
  assert.ok(buttons.includes(menuLabels.freshness5Days));
  assert.ok(buttons.includes(menuLabels.freshness3Days));
  assert.ok(buttons.includes(menuLabels.freshness1Day));
  assert.deepEqual(resolveMenuAction(menuLabels.materialFilter), {
    kind: "instruction",
    value: "show_material_filter"
  });
});

test("thesis filter menu exposes threshold controls", () => {
  const buttons = flattenKeyboard(buildSectionMenu("thesisFilter"));

  assert.ok(buttons.includes(menuLabels.softerFilter));
  assert.ok(buttons.includes(menuLabels.stricterFilter));
  assert.ok(buttons.includes(menuLabels.changeRuleScore));
  assert.ok(buttons.includes(menuLabels.changeTopicScore));
});

test("thesis filter message shows active scoring thresholds", () => {
  const message = buildThesisFilterMessage({
    name: "Базовый",
    min_rule_score: 55,
    min_final_score_for_topic: 70
  });

  assert.equal(message.includes("Min Rule Score: 55"), true);
  assert.equal(message.includes("Min Final Score for Topic: 70"), true);
  assert.equal(message.includes("Max AI items per run"), true);
});

test("material filter message shows active freshness setting", () => {
  const message = buildMaterialFilterMessage("Базовый", 3);

  assert.equal(message.includes("Профиль: Базовый"), true);
  assert.equal(message.includes("Свежесть материала: до 3 дней"), true);
});

function flattenKeyboard(markup: ReturnType<typeof buildSectionMenu>): string[] {
  return markup.keyboard.flatMap((row) => row.map((button) => button.text));
}
