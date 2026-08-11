import assert from "node:assert/strict";
import test from "node:test";
import { detectFeedType, parseFeedTitle } from "../src/collectors/xml";
import { extractDiscoveryPagePreview } from "../src/sources/discovery-page";

test("detectFeedType detects RSS and Atom", () => {
  assert.equal(detectFeedType("<rss><channel><title>A</title></channel></rss>"), "rss");
  assert.equal(detectFeedType("<feed><title>B</title></feed>"), "atom");
  assert.equal(detectFeedType("<html></html>"), "unsupported");
});

test("parseFeedTitle reads channel title", () => {
  assert.equal(parseFeedTitle("<rss><channel><title>Example Feed</title></channel></rss>"), "Example Feed");
});

test("extractDiscoveryPagePreview finds same-site article links", () => {
  const html = `
    <html>
      <head>
        <title>Creative Boom Digital</title>
        <meta property="og:site_name" content="Creative Boom">
      </head>
      <body>
        <nav><a href="/about">About</a></nav>
        <a href="/digital/design-systems-ai-product-teams">How AI tools are changing design systems for product teams</a>
        <a href="https://example.com/story">External story should be ignored</a>
        <a href="/digital/ux-research-product-decisions">Why UX research should shape better product decisions</a>
      </body>
    </html>
  `;

  const preview = extractDiscoveryPagePreview("https://www.creativeboom.com/digital/", html, 5);

  assert.equal(preview.siteName, "Creative Boom");
  assert.equal(preview.links.length, 2);
  assert.equal(preview.links[0].url, "https://www.creativeboom.com/digital/design-systems-ai-product-teams");
  assert.equal(preview.links[1].title, "Why UX research should shape better product decisions");
});
