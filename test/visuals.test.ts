import assert from "node:assert/strict";
import test from "node:test";
import { validateVisualBriefResponse } from "../src/visual/validation";

test("visual brief validation accepts structured response", () => {
  const brief = validateVisualBriefResponse({
    concept: "A designer weighing evidence, product constraints, and AI suggestions before choosing a direction.",
    metaphor: "A balance scale with signals and judgment",
    composition: "Centered editorial illustration with a calm workspace and abstract decision paths",
    style: "editorial vector illustration",
    color_direction: "restrained blue, green, and warm accent",
    aspect_ratio: "1:1"
  });

  assert.equal(brief.aspectRatio, "1:1");
  assert.equal(brief.style, "editorial vector illustration");
});

test("visual brief validation normalizes unsupported aspect ratio", () => {
  const brief = validateVisualBriefResponse({
    concept: "A designer translating research signals into product decisions with visible tradeoff paths.",
    style: "editorial vector illustration",
    color_direction: "restrained",
    aspect_ratio: "3:2"
  });

  assert.equal(brief.aspectRatio, "1:1");
});

test("visual callback payloads stay within Telegram callback_data limit", () => {
  const draftId = "draft_1234567890abcdef1234567890abcdef";
  const assetId = "vasset_1234567890abcdef1234567890abcdef";

  assert.ok(`draft:visual:${draftId}`.length <= 64);
  assert.ok(`visual:approve:${assetId}`.length <= 64);
  assert.ok(`visual:reject:${assetId}`.length <= 64);
  assert.ok(`visual:custom:${assetId}`.length <= 64);
  assert.ok(`visual:prev:${assetId}`.length <= 64);
  assert.ok(`visual:next:${assetId}`.length <= 64);
});
