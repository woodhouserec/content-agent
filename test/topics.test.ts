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
    shortDescription: "AI onboarding becomes a trust problem when users cannot see control, feedback, and recovery paths inside design tools.",
    shortDescriptionRu: "AI-onboarding становится задачей доверия, когда пользователь не видит контроль, обратную связь и способы восстановления внутри дизайн-инструмента.",
    audienceValue: "Helps Product/UX designers evaluate AI features as interaction systems.",
    audienceValueRu: "Помогает Product/UX-дизайнерам оценивать AI-фичи как интерактивные системы.",
    hrValue: "Shows mature product thinking beyond UI execution.",
    hrValueRu: "Показывает зрелое продуктовое мышление, а не только UI-исполнение.",
    recruiterValue: "Signals interaction-design judgment around trust, control, feedback, and recovery in AI-assisted tools.",
    recruiterValueRu: "Показывает interaction-design judgment вокруг доверия, контроля, обратной связи и восстановления в AI-инструментах.",
    suggestedAngleRu: "Разобрать AI-onboarding как задачу доверия, контроля и восстановления после ошибок."
  }], { minFinalScoreForTopic: 70 });

  assert.equal(topics.length, 1);
  assert.equal(topics[0].title, "What AI onboarding in design tools reveals about trust and control");
  assert.equal(topics[0].titleRu.includes("AI-onboarding"), true);
  assert.deepEqual(topics[0].sourceItemIds, ["item_ai_ux"]);
  assert.equal(topics[0].whyItMattersRu.includes("Ценность для рекрутера"), true);
});

test("topic formation uses specific AI post title and description", async () => {
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
    explanation: "This material has a practical UX angle for form design.",
    keyThesis: "Dropdowns can add unnecessary effort when a simpler input pattern better matches the user's decision.",
    keyThesisRu: "Dropdown может добавлять лишнее усилие, если более простой паттерн лучше соответствует пользовательскому выбору.",
    postTitle: "When a dropdown quietly adds product friction",
    postTitleRu: "Когда dropdown незаметно добавляет продуктовую фрикцию",
    shortDescription: "A form-control choice becomes a product decision when it changes effort, confidence, and completion.",
    shortDescriptionRu: "Выбор контрола в форме становится продуктовым решением, когда меняет усилие, уверенность и завершение сценария.",
    audienceValue: "Helps designers connect small form patterns with measurable user effort.",
    audienceValueRu: "Помогает дизайнерам связывать маленькие паттерны формы с реальным пользовательским усилием.",
    recruiterValue: "Signals attention to interaction detail and the ability to connect UI patterns with conversion friction.",
    recruiterValueRu: "Показывает внимание к interaction-деталям и умение связывать UI-паттерны с фрикцией в конверсии.",
    suggestedAngleRu: "Разобрать dropdown как маленькое решение, которое может менять усилие пользователя и завершение формы."
  }], { minFinalScoreForTopic: 70 });

  assert.equal(topics[0].title, "When a dropdown quietly adds product friction");
  assert.equal(topics[0].summaryRu, "Выбор контрола в форме становится продуктовым решением, когда меняет усилие, уверенность и завершение сценария.");
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
    explanation: "The material connects health insurance portal UX with trust, clarity, and customer confidence.",
    keyThesis: "Insurance self-service UX needs to reduce ambiguity because users make high-stakes decisions under uncertainty.",
    keyThesisRu: "UX self-service в страховании должен снижать неоднозначность, потому что пользователь принимает важные решения в условиях неопределённости.",
    postTitle: "Why insurance portals need UX that builds confidence, not just convenience",
    postTitleRu: "Почему страховым порталам нужен UX доверия, а не только удобства",
    shortDescription: "Health-insurance benchmarks reveal how clarity, account control, and risk perception shape confidence in self-service journeys.",
    shortDescriptionRu: "Бенчмарки UX медицинского страхования показывают, как ясность, контроль аккаунта и восприятие риска формируют уверенность в self-service сценариях.",
    audienceValue: "Gives Product/UX teams a concrete way to reason about trust in high-stakes portals.",
    audienceValueRu: "Даёт Product/UX-командам конкретный способ рассуждать о доверии в high-stakes порталах.",
    recruiterValue: "Signals mature judgment about trust, clarity, and task completion in sensitive product categories.",
    recruiterValueRu: "Показывает зрелое суждение о доверии, ясности и завершении задач в чувствительных продуктовых категориях.",
    suggestedAngleRu: "Разобрать страховой портал как продукт, где доверие и ясность важнее декоративного удобства."
  }], { minFinalScoreForTopic: 70 });

  assert.equal(topics.length, 1);
  assert.equal(topics[0].summaryRu.includes("Возможный пост о"), false);
  assert.equal(topics[0].summary.includes("A possible post about"), false);
  assert.match(topics[0].summaryRu, /довер|риск|ясност|health insurance|UX/i);
});

test("topic formation varies fallback summaries inside adjacent trust and healthcare materials", async () => {
  const insuranceItem = {
    id: "item_health_insurance",
    source_id: "src_test",
    title: "UX and NPS Benchmarks of Health Insurance Websites (2026)",
    summary: "Tech has improved a lot over the last ten years. Modern portals promise complete, on-demand control over health insurance accounts.",
    normalized_content: "Health insurance websites, NPS benchmarks, online account control, trust, clarity, and task completion.",
    final_score: 48,
    rule_score: 48,
    scoring_breakdown_json: JSON.stringify({ factors: { freshness: 8 } })
  } as CollectedItemRecord;
  const diagnosisItem = {
    id: "item_womens_health_ai",
    source_id: "src_test",
    title: "Building AI for Women's Health: How Hertility Combined Bayesian Diagnosis and Scan Automation",
    summary: "A women's health product combines Bayesian diagnosis and scan automation to support clinical workflows.",
    normalized_content: "AI healthcare product, diagnosis support, Bayesian reasoning, scan automation, clinical workflow, responsibility.",
    final_score: 48,
    rule_score: 48,
    scoring_breakdown_json: JSON.stringify({ factors: { freshness: 8 } })
  } as CollectedItemRecord;

  const insuranceTopics = await formTopics([insuranceItem], [], { minFinalScoreForTopic: 70 });
  const diagnosisTopics = await formTopics([diagnosisItem], [], { minFinalScoreForTopic: 70 });

  assert.equal(insuranceTopics.length, 1);
  assert.equal(diagnosisTopics.length, 1);
  assert.notEqual(insuranceTopics[0].summaryRu, diagnosisTopics[0].summaryRu);
  assert.match(insuranceTopics[0].summaryRu, /медицинского страхования|NPS|портал/i);
  assert.match(diagnosisTopics[0].summaryRu, /AI|healthcare|диагност|автоматизац/i);
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
    shortDescription: "Founder storytelling becomes useful when it clarifies product value instead of merely decorating the startup narrative.",
    shortDescriptionRu: "История фаундера становится полезной, когда проясняет продуктовую ценность, а не просто украшает стартап-нарратив.",
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
  assert.equal(topics[0].summaryRu.includes("Возможный пост о"), false);
  assert.equal(topics[0].summary.includes("A possible post about"), false);
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
