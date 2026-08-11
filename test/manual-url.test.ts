import assert from "node:assert/strict";
import test from "node:test";
import { ArticleExtractor } from "../src/manual-url/article-extractor";
import { analyzeManualUrlForDirectTopic, validateDirectTopicAnalysis } from "../src/manual-url/direct-topic-analysis";
import type { Env } from "../src/domain/runtime";
import type { CollectedItemRecord } from "../src/storage/collected-items";
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
          <article>
            <p>${"Product design and UX research text. ".repeat(40)}</p>
            <blockquote>Teams should translate UX evidence into product decisions, not just reports.</blockquote>
            <a href="/research">Related UX research resource</a>
          </article>
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
  assert.equal(article.quotes[0], "Teams should translate UX evidence into product decisions, not just reports.");
  assert.deepEqual(article.links[0], {
    text: "Related UX research resource",
    url: "https://example.com/research"
  });
});

test("direct manual URL topic analysis accepts specific AI response", () => {
  const analysis = validateDirectTopicAnalysis({
    title: "Why ecommerce UX benchmarks should become design decisions, not slide decoration",
    title_ru: "Почему UX-бенчмарки ecommerce должны становиться решениями, а не украшением презентаций",
    why_it_matters: "The source gives product teams concrete ecommerce behavior signals that can shape prioritization and reduce checkout friction.",
    why_it_matters_ru: "Материал даёт продуктовым командам конкретные сигналы поведения покупателей, которые можно использовать для приоритизации и снижения фрикции.",
    suggested_angle: "Use the Baymard findings to argue that UX research creates value when teams translate patterns into product decisions.",
    suggested_angle_ru: "Использовать выводы Baymard, чтобы показать: UX research ценен тогда, когда паттерны превращаются в продуктовые решения.",
    summary: "A source-specific direction about ecommerce quantitative UX insights and their role in product prioritization.",
    summary_ru: "Направление по конкретному материалу о количественных ecommerce UX-инсайтах и их роли в продуктовой приоритизации.",
    target_audience: "Product Designers, UX Researchers, Product Managers",
    novelty_score: 78,
    relevance_score: 91,
    reasoning_summary: "The article is relevant because it offers concrete UX behavior data and a practitioner angle on decision quality."
  });

  assert.equal(analysis.usedAi, true);
  assert.equal(analysis.relevanceScore, 91);
  assert.ok(analysis.title.includes("ecommerce UX"));
});

test("direct manual URL topic analysis accepts target audience as array", () => {
  const analysis = validateDirectTopicAnalysis({
    title: "Why ecommerce UX benchmarks should become design decisions, not slide decoration",
    title_ru: "Почему UX-бенчмарки ecommerce должны становиться решениями, а не украшением презентаций",
    why_it_matters: "The source gives product teams concrete ecommerce behavior signals that can shape prioritization and reduce checkout friction.",
    why_it_matters_ru: "Материал даёт продуктовым командам конкретные сигналы поведения покупателей, которые можно использовать для приоритизации и снижения фрикции.",
    suggested_angle: "Use the Baymard findings to argue that UX research creates value when teams translate patterns into product decisions.",
    suggested_angle_ru: "Использовать выводы Baymard, чтобы показать: UX research ценен тогда, когда паттерны превращаются в продуктовые решения.",
    summary: "A source-specific direction about ecommerce quantitative UX insights and their role in product prioritization.",
    summary_ru: "Направление по конкретному материалу о количественных ecommerce UX-инсайтах и их роли в продуктовой приоритизации.",
    target_audience: ["Product Designers", "UX Researchers", "Product Managers"],
    novelty_score: 78,
    relevance_score: 91,
    reasoning_summary: "The article is relevant because it offers concrete UX behavior data and a practitioner angle on decision quality."
  });

  assert.equal(analysis.targetAudience, "Product Designers, UX Researchers, Product Managers");
});

test("direct manual URL topic analysis does not create fallback without OpenAI", async () => {
  await assert.rejects(
    analyzeManualUrlForDirectTopic({} as Env, {
      id: "item_1",
      title: "Useful UX article",
      url: "https://example.com/article",
      summary: "A useful UX article with concrete product design context."
    } as CollectedItemRecord),
    /OPENAI_API_KEY/
  );
});
