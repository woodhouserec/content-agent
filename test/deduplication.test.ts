import assert from "node:assert/strict";
import test from "node:test";
import { normalizeCollectorItem } from "../src/pipeline/normalization.js";

test("dedupe keys are available after normalization", async () => {
  const item = await normalizeCollectorItem({
    externalId: "guid-1",
    sourceId: "source-1",
    title: "Same story",
    url: "https://example.com/story/?utm_medium=social#top",
    summary: "Summary",
    author: null,
    publishedAt: null,
    rawContent: "Raw",
    metadata: {},
    collectedAt: "2026-07-17T00:00:00.000Z"
  });

  assert.equal(item.externalId, "guid-1");
  assert.equal(item.sourceId, "source-1");
  assert.equal(item.canonicalUrl, "https://example.com/story");
  assert.match(item.contentHash, /^[a-f0-9]{64}$/);
});
