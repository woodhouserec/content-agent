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
  assert.equal(topics[0].whyItMattersRu.includes("Ценность для рекрутера"), true);
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
  assert.equal(topics[0].summaryRu.includes("Возможный пост о"), false);
});

test("topic formation avoids mechanical summary text in AI-backed cards", async () => {
  const item = {
    id: "item_health_benchmark",
    source_id: "src_test",
    title: "UX and NPS Benchmarks of Health Insurance Websites (2026)",
    summary: "A benchmark article about health insurance portals, online policy management, customer confidence, and risk perception.",
    normalized_content: "Health insurance websites need clarity, trust, confidence, and better interaction decisions in a sensitive product category.",
    final_score: 84,
    rule_score: 82,
    scoring_breakdown_json: JSON.stringify({ factors: { freshness: 18 } })
  } as CollectedItemRecord;

  const topics = await formTopics([item], [{
    itemId: "item_health_benchmark",
    aiRelevanceScore: 88,
    noveltyScore: 68,
    professionalValue: 86,
    possibleLinkedInAngle: "What health insurance UX benchmarks reveal about trust and risk perception",
    explanation: "The material connects health insurance portal UX with trust, clarity, and customer confidence."
  }], { minFinalScoreForTopic: 70 });

  assert.equal(topics.length, 1);
  assert.equal(topics[0].summaryRu.includes("Возможный пост о"), false);
  assert.equal(topics[0].summary.includes("A possible post about"), false);
  assert.match(topics[0].summaryRu, /довер|риск|ясност|health insurance|UX/i);
});

test("topic formation can use strong AI signal when final score is below hard threshold", async () => {
  const item = {
    id: "item_creativeboom",
    source_id: "src_creativeboom",
    title: "How to make people care about your startup",
    summary: "A source about turning a founder story into a communication strategy.",
    normalized_content: "Startup teams need clearer communication choices when presenting product value.",
    final_score: 61,
    rule_score: 60,
    scoring_breakdown_json: JSON.stringify({ factors: { freshness: 8 } })
  } as CollectedItemRecord;

  const topics = await formTopics([item], [{
    itemId: "item_creativeboom",
    aiRelevanceScore: 72,
    noveltyScore: 66,
    professionalValue: 78,
    possibleLinkedInAngle: "How startup storytelling can make product value easier to understand",
    explanation: "The material can become a practical Product/Founder post about communication and product value.",
    postTitle: "How startup storytelling can make product value easier to understand",
    postTitleRu: "Как стартап-сторителлинг помогает понятнее показать продуктовую ценность",
    shortDescription: "A post about using founder storytelling as a product communication tool, not just a marketing story.",
    shortDescriptionRu: "Пост о том, как использовать историю фаундера как инструмент объяснения продуктовой ценности, а не просто маркетинговый рассказ.",
    audienceValue: "Helps founders and product designers connect narrative with product clarity.",
    audienceValueRu: "Помогает фаундерам и продуктовым дизайнерам связать нарратив с ясностью продукта.",
    hrValue: "Shows strategic product communication thinking.",
    hrValueRu: "Показывает стратегическое мышление о продуктовой коммуникации.",
    recruiterValue: "Signals strategic communication and the ability to connect story with product value.",
    recruiterValueRu: "Показывает стратегическую коммуникацию и умение связывать историю с продуктовой ценностью.",
    suggestedAngleRu: "Разобрать историю стартапа как продуктовый инструмент объяснения ценности."
  }], { minFinalScoreForTopic: 70 });

  assert.equal(topics.length, 1);
  assert.equal(topics[0].title, "How startup storytelling can make product value easier to understand");
  assert.equal(topics[0].whyItMattersRu.includes("Ценность для рекрутера"), true);
  assert.equal(topics[0].whyItMattersRu.includes("продуктовой ценностью"), true);
});

test("topic formation creates source-grounded fallback when current source items are below threshold", async () => {
  const item = {
    id: "item_creativeboom_low",
    source_id: "src_creativeboom",
    title: "A creative digital design article from the current source",
    summary: "The article gives enough context for a practical Product/UX post preview.",
    normalized_content: "The source discusses digital design work and product communication in a concrete way.",
    final_score: 48,
    rule_score: 48,
    scoring_breakdown_json: JSON.stringify({ factors: { freshness: 8 } })
  } as CollectedItemRecord;

  const topics = await formTopics([item], [], { minFinalScoreForTopic: 70 });

  assert.equal(topics.length, 1);
  assert.equal(topics[0].title.includes(item.title), true);
  assert.deepEqual(topics[0].sourceItemIds, [item.id]);
  assert.equal(topics[0].whyItMattersRu.includes("Ценность для рекрутера"), true);
});

test("topic formation varies recruiter value by material signal", async () => {
  const restaurantItem = {
    id: "item_restaurant",
    source_id: "src_creativeboom",
    title: "Koto helps restaurant-discovery app Franki make time dance",
    summary: "A restaurant discovery app uses brand, timing, service experience, and user context to shape how people choose where to go.",
    normalized_content: "Restaurant discovery, timing, user intent, service experience, and mobile app context.",
    final_score: 48,
    rule_score: 48,
    scoring_breakdown_json: JSON.stringify({ factors: { freshness: 8 } })
  } as CollectedItemRecord;
  const bettingItem = {
    id: "item_betting",
    source_id: "src_creativeboom",
    title: "How Nomad reimagined Stoiximan, the homegrown brand that became Greece's biggest name in betting",
    summary: "A betting brand identity with a custom wordmark, trust signals, category risk, and product confidence cues.",
    normalized_content: "Betting, trust, risk perception, brand identity, wordmark, and regulated category cues.",
    final_score: 48,
    rule_score: 48,
    scoring_breakdown_json: JSON.stringify({ factors: { freshness: 8 } })
  } as CollectedItemRecord;

  const restaurantTopics = await formTopics([restaurantItem], [], { minFinalScoreForTopic: 70 });
  const bettingTopics = await formTopics([bettingItem], [], { minFinalScoreForTopic: 70 });

  assert.equal(restaurantTopics.length, 1);
  assert.equal(bettingTopics.length, 1);
  assert.notEqual(restaurantTopics[0].whyItMattersRu, bettingTopics[0].whyItMattersRu);
  assert.match(restaurantTopics[0].whyItMattersRu, /service-design|timing|намерени|контекст/i);
  assert.match(bettingTopics[0].whyItMattersRu, /довер|риск|trust-heavy|чувствительной категории/i);
  assert.equal(restaurantTopics[0].whyItMattersRu.includes("превращается не в пересказ ссылки"), false);
  assert.equal(bettingTopics[0].whyItMattersRu.includes("превращается не в пересказ ссылки"), false);
});

test("topic formation does not classify research materials as service discovery", async () => {
  const item = {
    id: "item_alpha_inflation",
    source_id: "src_research",
    title: "Understanding Alpha Inflation",
    summary: "A research article about statistical tests, sample size, evidence quality, and stakeholder buy-in for quantitative UX research.",
    normalized_content: "UX research teams need to understand evidence quality, alpha inflation, statistical significance, and risk in research decisions.",
    final_score: 48,
    rule_score: 48,
    scoring_breakdown_json: JSON.stringify({ factors: { freshness: 8 } })
  } as CollectedItemRecord;

  const topics = await formTopics([item], [], { minFinalScoreForTopic: 70 });

  assert.equal(topics.length, 1);
  assert.match(topics[0].whyItMattersRu, /исследовательской зрелости|evidence|приоритизац|риски/i);
  assert.match(topics[0].suggestedAngleRu, /research|evidence|решения|риск/i);
  assert.equal(topics[0].whyItMattersRu.includes("service-design"), false);
  assert.equal(topics[0].whyItMattersRu.includes("discovery-продукты"), false);
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
