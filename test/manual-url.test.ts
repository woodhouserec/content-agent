import assert from "node:assert/strict";
import test from "node:test";
import { ArticleExtractor } from "../src/manual-url/article-extractor";
import { assertSafeHttpUrl } from "../src/manual-url/url-safety";

test("manual URL safety rejects localhost and private IPs", () => {
  assert.throws(() => assertSafeHttpUrl("http://localhost/article"), /Localhost/);
  assert.throws(() => assertSafeHttpUrl("http://127.0.0.1/article"), /Private|loopback/);
  assert.throws(() => assertSafeHttpUrl("http://192.168.1.10/article"), /Private/);
  assert.throws(() => assertSafeHttpUrl("file:///etc/passwd"), /HTTP and HTTPS/);
});

test("article extractor reads static metadata and text", () => {
  const extractor = new ArticleExtractor();
  const article = extractor.extract("https://example.com/post?utm_source=x", {
    finalUrl: "https://example.com/post?utm_source=x",
    fetchedAt: "2026-07-17T00:00:00.000Z",
    contentType: "text/html",
    contentLength: 1200,
    html: `
      <html lang="en">
        <head>
          <title>Fallback title</title>
          <link rel="canonical" href="https://example.com/post" />
          <meta property="og:title" content="OG Title" />
          <meta property="og:site_name" content="Example Site" />
          <meta name="description" content="Useful article description." />
          <meta name="author" content="Jane Doe" />
          <meta property="article:published_time" content="2026-07-16T10:00:00Z" />
        </head>
        <body>
          <nav>Navigation</nav>
          <article><p>${"Product design and UX research text. ".repeat(40)}</p></article>
        </body>
      </html>`
  });

  assert.equal(article.title, "OG Title");
  assert.equal(article.siteName, "Example Site");
  assert.equal(article.author, "Jane Doe");
  assert.equal(article.canonicalUrl, "https://example.com/post");
  assert.equal(article.extractionStatus, "accepted");
  assert.ok(article.text?.includes("Product design"));
  assert.ok(!article.text?.includes("Navigation"));
});
