import assert from "node:assert/strict";
import test from "node:test";
import type { CollectedItemRecord } from "../src/storage/collected-items";
import type { Env } from "../src/domain/runtime";
import { validateAiResults, scoreWithOpenAi } from "../src/scoring/openai";
import { scoringConfig } from "../src/scoring/config";
import { scoreCollectedItem } from "../src/scoring/rule-based";

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
