import assert from "node:assert/strict";
import test from "node:test";
import { parseFeedEntries } from "../src/collectors/xml.js";

test("parseFeedEntries reads RSS 2.0 items", () => {
  const entries = parseFeedEntries(`<?xml version="1.0"?>
    <rss version="2.0">
      <channel>
        <item>
          <title><![CDATA[Design systems]]></title>
          <link>https://example.com/design-systems?utm_source=rss</link>
          <guid>rss-1</guid>
          <description><![CDATA[<p>Useful summary</p>]]></description>
          <dc:creator>Author Name</dc:creator>
          <pubDate>Fri, 17 Jul 2026 10:00:00 GMT</pubDate>
        </item>
      </channel>
    </rss>`);

  assert.equal(entries.length, 1);
  assert.equal(entries[0]?.externalId, "rss-1");
  assert.equal(entries[0]?.title, "Design systems");
  assert.equal(entries[0]?.summary, "Useful summary");
  assert.equal(entries[0]?.author, "Author Name");
  assert.equal(entries[0]?.metadata.feedFormat, "rss");
});

test("parseFeedEntries reads Atom entries", () => {
  const entries = parseFeedEntries(`<?xml version="1.0"?>
    <feed xmlns="http://www.w3.org/2005/Atom">
      <entry>
        <id>tag:example.com,2026:1</id>
        <title>Product discovery</title>
        <link rel="alternate" href="https://example.com/product-discovery" />
        <summary>Atom summary</summary>
        <author><name>Jane</name></author>
        <updated>2026-07-17T10:00:00Z</updated>
      </entry>
    </feed>`);

  assert.equal(entries.length, 1);
  assert.equal(entries[0]?.externalId, "tag:example.com,2026:1");
  assert.equal(entries[0]?.url, "https://example.com/product-discovery");
  assert.equal(entries[0]?.author, "Jane");
  assert.equal(entries[0]?.metadata.feedFormat, "atom");
});
