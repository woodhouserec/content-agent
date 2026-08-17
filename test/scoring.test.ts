import assert from "node:assert/strict";
import test from "node:test";
import type { CollectedItemRecord } from "../src/storage/collected-items";
import type { Env } from "../src/domain/runtime";
import { validateAiResults, scoreWithOpenAi } from "../src/scoring/openai";
import { scoringConfig } from "../src/scoring/config";
import { scoreCollectedItem } from "../src/scoring/rule-based";
import { buildScoringPrompt } from "../src/scoring/prompts";
import { profileFocusKeywords, storedProfileToPromptAuthorProfile } from "../src/scoring/relevance-profile";
import { modeFilterSql } from "../src/storage/collected-items";
import type { RelevanceProfileRecord } from "../src/storage/relevance-profiles";

test("rule-based scoring boosts relevant UX/Product material", () => {
  const score = scoreCollectedItem(makeItem({
    title: "AI in product design systems and UX research",
    summary: "A detailed discussion of how product design teams use AI and research to improve SaaS decisions.",
    source_id: "src_nngroup_articles"
  }));

  assert.ok(score.score >= 70);
  assert.ok(score.boosts.length > 0);
  assert.equal(score.version, scoringConfig.scoringVersion);
});

test("source metadata improves score but does not override irrelevant content", () => {
  const irrelevant = scoreCollectedItem(makeItem({
    title: "Sponsored crypto coupon sale",
    summary: "Buy now.",
    source_id: "src_nngroup_articles",
    metadata_json: JSON.stringify({
      sourceConfig: {
        source_tier: "primary",
        content_kind: "original_research",
        trust_score: 100,
        editorial_priority: 5
      }
    })
  }));

  assert.ok(irrelevant.score < 70);
});

test("rule-based scoring penalizes shallow promotional material", () => {
  const score = scoreCollectedItem(makeItem({
    title: "Sponsored top tools sale",
    summary: "Buy now.",
    source_id: "unknown"
  }));

  assert.ok(score.score < 60);
  assert.ok(score.penalties.length > 0);
});

test("AI JSON validation accepts structured scoring response", () => {
  const results = validateAiResults({
    results: [
      {
        itemId: "item_1",
        aiRelevanceScore: 82,
        noveltyScore: 74,
        professionalValue: 88,
        possibleLinkedInAngle: "Why UX research still matters in AI-assisted product design",
        explanation: "Strong practitioner angle.",
        keyThesis: "AI-assisted design still needs research judgment to decide what evidence should change.",
        keyThesisRu: "AI-assisted design всё равно требует исследовательского суждения о том, какие evidence должны менять решение.",
        postTitle: "Why AI-assisted design still needs research judgment",
        postTitleRu: "Почему AI-assisted design всё ещё требует research judgment",
        shortDescription: "Research judgment becomes the safeguard that keeps AI-assisted design tied to evidence, prioritization, and product risk.",
        shortDescriptionRu: "Research judgment становится защитным слоем, который связывает AI-assisted design с evidence, приоритизацией и продуктовым риском.",
        audienceValue: "Helps Product/UX teams use AI without weakening evidence-based decisions.",
        audienceValueRu: "Помогает Product/UX-командам использовать AI без ослабления evidence-based решений.",
        recruiterValue: "Signals research maturity and the ability to connect AI workflows with product decision quality.",
        recruiterValueRu: "Показывает исследовательскую зрелость и умение связывать AI-workflow с качеством продуктовых решений.",
        suggestedAngleRu: "Разобрать AI-assisted design через research judgment, evidence и качество продуктовых решений."
      }
    ]
  });

  assert.equal(results[0]?.aiRelevanceScore, 82);
});

test("scoring prompt uses active relevance profile", () => {
  const profile = storedProfileToPromptAuthorProfile(makeProfile({
    name: "HR Lens",
    role: "Product Designer writing for hiring managers",
    focus_json: JSON.stringify(["Portfolio strategy", "Hiring signal"]),
    audience_json: JSON.stringify(["Recruiters", "Design Managers"]),
    tone: "sharp, practical, evidence-led",
    position: "portfolio signal, not generic UX commentary"
  }));
  const prompt = buildScoringPrompt(profile);

  assert.match(prompt, /HR Lens/);
  assert.match(prompt, /Product Designer writing for hiring managers/);
  assert.match(prompt, /Portfolio strategy, Hiring signal/);
  assert.match(prompt, /Recruiters, Design Managers/);
  assert.match(prompt, /sharp, practical, evidence-led/);
});

test("profile focus keywords prefer selected profile focus", () => {
  const keywords = profileFocusKeywords(makeProfile({
    focus_json: JSON.stringify(["Hiring signal", "Portfolio strategy"])
  }));

  assert.ok(keywords.includes("hiring signal"));
  assert.ok(keywords.includes("hiring"));
  assert.ok(keywords.includes("portfolio strategy"));
  assert.ok(keywords.includes("portfolio"));
  assert.equal(keywords.includes("product design"), false);
});

test("AI JSON validation rejects malformed response", () => {
  assert.throws(() => validateAiResults({ nope: [] }), /results array/);
});

test("AI JSON validation rejects generic post-preview text", () => {
  assert.throws(() => validateAiResults({
    results: [
      {
        itemId: "item_1",
        aiRelevanceScore: 82,
        noveltyScore: 74,
        professionalValue: 88,
        possibleLinkedInAngle: "Why UX research still matters in AI-assisted product design",
        explanation: "Strong practitioner angle.",
        keyThesis: "AI-assisted design still needs research judgment to decide what evidence should change.",
        keyThesisRu: "AI-assisted design всё равно требует исследовательского суждения о том, какие evidence должны менять решение.",
        postTitle: "Why AI-assisted design still needs research judgment",
        postTitleRu: "Почему AI-assisted design всё ещё требует research judgment",
        shortDescription: "A post about why AI-assisted design still matters for product teams.",
        shortDescriptionRu: "Пост о том, почему AI-assisted design важен для продуктовых команд.",
        audienceValue: "Helps Product/UX teams use AI without weakening evidence-based decisions.",
        audienceValueRu: "Помогает Product/UX-командам использовать AI без ослабления evidence-based решений.",
        recruiterValue: "Signals research maturity and the ability to connect AI workflows with product decision quality.",
        recruiterValueRu: "Показывает исследовательскую зрелость и умение связывать AI-workflow с качеством продуктовых решений.",
        suggestedAngleRu: "Разобрать AI-assisted design через research judgment, evidence и качество продуктовых решений."
      }
    ]
  }), /shortDescription is too generic/);
});

test("OpenAI scoring falls back when API key is absent", async () => {
  const result = await scoreWithOpenAi({} as Env, [makeItem({})]);

  assert.equal(result.usedFallback, true);
  assert.equal(result.results.length, 0);
});

test("OpenAI scoring times out instead of hanging", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = ((...args: Parameters<typeof fetch>) => {
    const signal = args[1]?.signal;
    return new Promise<Response>((_resolve, reject) => {
      signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
    });
  }) as typeof fetch;

  try {
    await assert.rejects(
      () => scoreWithOpenAi({ OPENAI_API_KEY: "test" } as Env, [makeItem({})], { timeoutMs: 5 }),
      /OpenAI scoring timed out/
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("permanent scoring candidates require enabled permanent sources", () => {
  const filter = modeFilterSql("permanent");

  assert.equal(filter.includes("sources.enabled = 1"), true);
  assert.equal(filter.includes("sources.id = collected_items.source_id"), true);
});

function makeItem(overrides: Partial<CollectedItemRecord>): CollectedItemRecord {
  return {
    id: "item_1",
    source_id: "src_nngroup_articles",
    external_id: "external",
    url: "https://example.com/item",
    canonical_url: "https://example.com/item",
    title: "Product design",
    summary: "Useful UX research and Product Design material for SaaS teams.",
    raw_content: null,
    normalized_content: null,
    author: null,
    published_at: new Date().toISOString(),
    collected_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
    content_hash: "hash",
    relevance_score: null,
    rule_score: null,
    ai_score: null,
    final_score: null,
    scoring_breakdown_json: null,
    scored_at: null,
    scoring_version: null,
    status: "collected",
    metadata_json: null,
    ...overrides
  };
}

function makeProfile(overrides: Partial<RelevanceProfileRecord>): RelevanceProfileRecord {
  return {
    id: "profile_test",
    name: "Test profile",
    role: "Custom role",
    focus_json: JSON.stringify(["Custom focus"]),
    audience_json: JSON.stringify(["Custom audience"]),
    tone: "Custom tone",
    position: "Custom position",
    min_rule_score: 60,
    min_final_score_for_topic: 70,
    memory_json: "{}",
    is_active: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    ...overrides
  };
}
