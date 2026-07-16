import assert from "node:assert/strict";
import test from "node:test";
import { detectFeedType, parseFeedTitle } from "../src/collectors/xml";

test("detectFeedType detects RSS and Atom", () => {
  assert.equal(detectFeedType("<rss><channel><title>A</title></channel></rss>"), "rss");
  assert.equal(detectFeedType("<feed><title>B</title></feed>"), "atom");
  assert.equal(detectFeedType("<html></html>"), "unsupported");
});

test("parseFeedTitle reads channel title", () => {
  assert.equal(parseFeedTitle("<rss><channel><title>Example Feed</title></channel></rss>"), "Example Feed");
});
