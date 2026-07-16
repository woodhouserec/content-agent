import assert from "node:assert/strict";
import test from "node:test";
import {
  assertRevisionLimit,
  canGenerateDraftForTopicStatus,
  validateDraftBriefResponse,
  validateDraftGenerationResponse,
  validateFactualReviewResponse
} from "../src/drafts/validation";

test("draft generation is allowed only for selected topics", () => {
  assert.equal(canGenerateDraftForTopicStatus("selected"), true);
  assert.equal(canGenerateDraftForTopicStatus("candidate"), false);
  assert.equal(canGenerateDraftForTopicStatus("sent"), false);
  assert.equal(canGenerateDraftForTopicStatus("skipped"), false);
});

test("draft brief structured response is validated and normalized", () => {
  const brief = validateDraftBriefResponse({
    central_thesis: "Designers should use AI as support, not abdication.",
    author_position: "Practitioner insight",
    supporting_points: ["AI can speed up exploration", "Product responsibility remains human"],
    source_facts: ["The source discusses UX outcome reporting"],
    practical_takeaway: "Use AI to improve decision quality.",
    target_audience: "Product Designers",
    desired_length: "default",
    tone: "thoughtful and professional",
    factual_constraints: ["Do not invent adoption numbers"]
  });

  assert.equal(brief.centralThesis, "Designers should use AI as support, not abdication.");
  assert.deepEqual(brief.supportingPoints, ["AI can speed up exploration", "Product responsibility remains human"]);
});

test("draft generation response rejects too-short content", () => {
  assert.throws(() => validateDraftGenerationResponse({ content: "Too short" }), /Invalid content/);
});

test("factual review flags serious conflicts", () => {
  const review = validateFactualReviewResponse({
    has_serious_conflict: true,
    flags: ["Unsupported number"],
    summary: "The draft includes a number that is not in the sources."
  });

  assert.equal(review.hasSeriousConflict, true);
  assert.deepEqual(review.flags, ["Unsupported number"]);
});

test("revision limit throws when exhausted", () => {
  assert.doesNotThrow(() => assertRevisionLimit(4, 5));
  assert.throws(() => assertRevisionLimit(5, 5), /Revision limit reached/);
});

test("draft callback payloads stay within Telegram callback_data limit", () => {
  const draftId = "draft_1234567890abcdef1234567890abcdef";
  const callbacks = [
    `topic:draft:topic_1234567890abcdef1234567890abcdef`,
    `draft:rewrite:${draftId}`,
    `draft:shorten:${draftId}`,
    `draft:custom:${draftId}`,
    `draft:approve:${draftId}`
  ];

  for (const callback of callbacks) {
    assert.ok(callback.length <= 64, callback);
  }
});

