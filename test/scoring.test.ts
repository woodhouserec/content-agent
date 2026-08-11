import assert from "node:assert/strict";
import test from "node:test";
import type { CollectedItemRecord } from "../src/storage/collected-items";
import type { Env } from "../src/domain/runtime";
import { validateAiResults, scoreWithOpenAi } from "../src/scoring/openai";
import { scoringConfig } from "../src/scoring/config";
import { scoreCollectedItem } from "../src/scoring/rule-based";
import { modeFilterSql } from "../src/storage/collected-items";

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
        explanation: "Strong practitioner angle."
      }
    ]
  });

  assert.equal(results[0]?.aiRelevanceScore, 82);
});

test("AI JSON validation rejects malformed response", () => {
  assert.throws(() => validateAiResults({ nope: [] }), /results array/);
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
