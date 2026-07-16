import assert from "node:assert/strict";
import test from "node:test";
import { normalizeCollectorItem } from "../src/pipeline/normalization.js";

test("normalization strips HTML, canonicalizes URL, and limits text", async () => {
  const item = await normalizeCollectorItem({
    externalId: "abc",
    sourceId: "source",
    title: "  <b>Hello</b>   world ",
    url: "https://example.com/post/?utm_source=test#section",
    summary: "<p>Summary&nbsp; text</p>",
    author: " Author ",
    publishedAt: "2026-07-17T00:00:00.000Z",
    rawContent: "<script>alert(1)</script><p>Body text</p>",
    metadata: { fixture: true },
    collectedAt: "2026-07-17T00:00:00.000Z"
  });

  assert.equal(item.title, "Hello world");
  assert.equal(item.canonicalUrl, "https://example.com/post");
  assert.equal(item.summary, "Summary text");
  assert.equal(item.rawContent, "Body text");
  assert.equal(item.author, "Author");
  assert.equal(item.contentHash.length, 64);
});

test("normalization creates stable hashes for duplicate content", async () => {
  const base = {
    externalId: "abc",
    sourceId: "source",
    title: "Title",
    url: "https://example.com/post?utm_campaign=x",
    summary: "Summary",
    author: null,
    publishedAt: null,
    rawContent: "Body",
    metadata: {},
    collectedAt: "2026-07-17T00:00:00.000Z"
  };

  const first = await normalizeCollectorItem(base);
  const second = await normalizeCollectorItem({
    ...base,
    url: "https://example.com/post"
  });

  assert.equal(first.contentHash, second.contentHash);
});

test("normalization rejects invalid URLs", async () => {
  await assert.rejects(
    () => normalizeCollectorItem({
      externalId: "bad",
      sourceId: "source",
      title: "Broken link",
      url: "not a valid url",
      summary: null,
      author: null,
      publishedAt: null,
      rawContent: null,
      metadata: {},
      collectedAt: "2026-07-17T00:00:00.000Z"
    }),
    /Invalid URL/
  );
});
