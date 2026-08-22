import assert from "node:assert/strict";
import test from "node:test";
import { formatCollectionFinishedMessage } from "../src/pipeline/telegram-collection-job";

test("collection finished message shows source names and urls for errors", () => {
  const message = formatCollectionFinishedMessage({
    processedSources: 1,
    successfulSources: 0,
    failedSources: 1,
    receivedItems: 0,
    normalizedItems: 0,
    newItems: 0,
    duplicateItems: 0,
    errors: [{
      sourceId: "src_figma_blog",
      sourceName: "Figma Blog",
      sourceUrl: "https://www.figma.com/blog/feed/",
      stage: "fetch",
      message: "HTTP 404",
      recoverable: false
    }]
  });

  assert.match(message, /Figma Blog/);
  assert.match(message, /https:\/\/www\.figma\.com\/blog\/feed\//);
  assert.match(message, /fetch - HTTP 404/);
});
