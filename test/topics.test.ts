import assert from "node:assert/strict";
import test from "node:test";
import type { CollectedItemRecord } from "../src/storage/collected-items";
import { createTopicFingerprint, normalizeForFingerprint } from "../src/scoring/topic-fingerprint";
import { classifyItem, formTopics } from "../src/scoring/topic-formation";
import { formatTopicSources } from "../src/telegram/topics";
import type { TopicRecord } from "../src/storage/topics";

test("topic fingerprint normalizes similar title text", async () => {
  const first = await createTopicFingerprint(
    "Why AI changes the role of product designers",
    "Use as a practitioner reflection",
    ["b", "a"]
  );
  const second = await createTopicFingerprint(
    "AI changes role of Product Designers!",
    "Use as practitioner reflection",
    ["a", "b"]
  );

  assert.equal(first, second);
});

test("fingerprint normalization removes filler words and punctuation", () => {
  assert.equal(
    normalizeForFingerprint("Why the Design Systems, and Product Teams!"),
    "design systems product teams"
  );
});

test("topic classification keeps form usability separate from broad AI topics", () => {
  const item = {
    title: "The 6 UX Principles That Reduce User Frustration When Filling Out Forms",
    summary: "Input validation, field labels, checkout friction, and signup form usability patterns.",
    normalized_content: "Teams can reduce form friction by improving input fields and validation.",
    metadata_json: null
  } as CollectedItemRecord;

  assert.equal(classifyItem(item), "forms_usability");
});

test("topic classification recognizes design system governance", () => {
  const item = {
    title: "How variables and tokens change design system governance",
    summary: "A component library needs governance, tokens, patterns, and adoption workflows.",
    normalized_content: "Design system teams need governance for components and variables.",
    metadata_json: null
  } as CollectedItemRecord;

  assert.equal(classifyItem(item), "design_systems_governance");
});

test("topic formation includes Russian review fields for Telegram", async () => {
  const item = {
    id: "item_forms",
    source_id: "src_test",
    title: "The 6 UX Principles That Reduce User Frustration When Filling Out Forms",
    summary: "Input validation, field labels, checkout friction, and signup form usability patterns.",
    normalized_content: "Teams can reduce form friction by improving input fields and validation.",
    final_score: 82,
    scoring_breakdown_json: JSON.stringify({ factors: { freshness: 18 } })
  } as CollectedItemRecord;

  const topics = await formTopics([item], [], { minFinalScoreForTopic: 70 });

  assert.equal(topics.length, 1);
  assert.equal(topics[0].titleRu.includes(item.title), true);
  assert.equal(topics[0].whyItMattersRu.length > 20, true);
  assert.equal(topics[0].suggestedAngleRu.length > 20, true);
});

test("topic formation prefers AI post ideas over generic clusters", async () => {
  const item = {
    id: "item_ai_ux",
    source_id: "src_test",
    title: "A practical teardown of AI onboarding patterns in design tools",
    summary: "The source compares concrete onboarding decisions in AI-assisted design tools.",
    normalized_content: "AI onboarding needs control, feedback, empty states, and recovery patterns.",
    final_score: 86,
    rule_score: 82,
    scoring_breakdown_json: JSON.stringify({ factors: { freshness: 18 } })
  } as CollectedItemRecord;

  const topics = await formTopics([item], [{
    itemId: "item_ai_ux",
    aiRelevanceScore: 90,
    noveltyScore: 77,
    professionalValue: 92,
    possibleLinkedInAngle: "What AI onboarding in design tools reveals about trust and control",
    explanation: "The material gives a concrete UX angle on onboarding, trust, and interaction design.",
    postTitle: "What AI onboarding in design tools reveals about trust and control",
    postTitleRu: "Что AI-onboarding в дизайн-инструментах показывает про доверие и контроль",
    shortDescription: "A post about why AI features need onboarding patterns that explain control, feedback, and recovery.",
    shortDescriptionRu: "Пост о том, почему AI-фичам нужны onboarding-паттерны, объясняющие контроль, обратную связь и восстановление.",
    audienceValue: "Helps Product/UX designers evaluate AI features as interaction systems.",
    audienceValueRu: "Помогает Product/UX-дизайнерам оценивать AI-фичи как интерактивные системы.",
    hrValue: "Shows mature product thinking beyond UI execution.",
    hrValueRu: "Показывает зрелое продуктовое мышление, а не только UI-исполнение.",
    suggestedAngleRu: "Разобрать AI-onboarding как задачу доверия, контроля и восстановления после ошибок."
  }], { minFinalScoreForTopic: 70 });

  assert.equal(topics.length, 1);
  assert.equal(topics[0].title, "What AI onboarding in design tools reveals about trust and control");
  assert.equal(topics[0].titleRu.includes("AI-onboarding"), true);
  assert.deepEqual(topics[0].sourceItemIds, ["item_ai_ux"]);
  assert.equal(topics[0].whyItMattersRu.includes("Ценность для аудитории"), true);
});

test("topic formation replaces generic AI post title with source-grounded title", async () => {
  const item = {
    id: "item_forms",
    source_id: "src_test",
    title: "Does Your Form Really Need a Dropdown List?",
    summary: "The source explains when dropdowns create friction and when alternatives help users complete forms.",
    normalized_content: "Dropdowns can increase user effort when options are predictable or few.",
    final_score: 88,
    rule_score: 84,
    scoring_breakdown_json: JSON.stringify({ factors: { freshness: 18 } })
  } as CollectedItemRecord;

  const topics = await formTopics([item], [{
    itemId: "item_forms",
    aiRelevanceScore: 90,
    noveltyScore: 70,
    professionalValue: 88,
    possibleLinkedInAngle: "Why small form decisions can create outsized product friction",
    explanation: "This material has a practical UX angle for form design."
  }], { minFinalScoreForTopic: 70 });

  assert.equal(topics[0].title.includes("Does Your Form Really Need a Dropdown List?"), true);
  assert.equal(topics[0].summaryRu.startsWith("Основано на"), false);
});

test("formatTopicSources renders clickable source links", () => {
  const topic = {
    id: "topic_1",
    title: "Source topic",
    title_ru: "Тезис по источнику",
    source_item_ids_json: "[]"
  } as TopicRecord;

  const message = formatTopicSources(topic, [{
    title: "Does Your Form Really Need a Dropdown List?",
    canonical_url: "https://example.com/forms?utm_source=test",
    published_at: "2026-08-12T00:00:00.000Z"
  }]);

  assert.equal(message.includes('<a href="https://example.com/forms?utm_source=test">Does Your Form Really Need a Dropdown List?</a>'), true);
});
