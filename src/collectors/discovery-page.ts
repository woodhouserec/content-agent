import { ArticleExtractor } from "../manual-url/article-extractor";
import { ArticleFetcher } from "../manual-url/article-fetcher";
import { extractDiscoveryPagePreview } from "../sources/discovery-page";
import type { SourceRecord } from "../storage/sources";
import { nowIso } from "../utils/time";
import { getSourceLimit, parseSourceConfig } from "./config";
import type { Collector, CollectorConfig, CollectorError, CollectorItem, CollectorResult } from "./types";

export class DiscoveryPageCollector implements Collector {
  readonly type = "discovery_page" as const;

  async collect(source: SourceRecord, config: CollectorConfig): Promise<CollectorResult> {
    const fetcher = new ArticleFetcher({ timeoutMs: config.timeoutMs, maxBytes: 250_000 });
    const extractor = new ArticleExtractor();
    const sourceConfig = parseSourceConfig(source.config_json);
    const limit = getSourceLimit(source.config_json, config.maxItemsPerSource, sourceConfig.article_link_limit ?? 5);
    const errors: CollectorError[] = [];

    try {
      const page = await fetcher.fetch(source.url);
      const preview = extractDiscoveryPagePreview(page.finalUrl, page.html, Math.max(limit * 2, 8));
      const items: CollectorItem[] = [];

      if (preview.links.length === 0) {
        return {
          sourceId: source.id,
          ok: false,
          items: [],
          errors: [{
            sourceId: source.id,
            stage: "parse",
            message: "Discovery page did not contain usable article links in static HTML.",
            recoverable: false
          }]
        };
      }

      const articleResults = await mapWithConcurrency(preview.links.slice(0, limit), 3, async (link) => {
        try {
          const fetched = await fetcher.fetch(link.url);
          const article = extractor.extract(link.url, fetched);

          if (article.extractionStatus === "unsupported" || (!article.title && !article.description && !article.text)) {
            return {
              item: null,
              error: {
                sourceId: source.id,
                stage: "item",
                message: `Article skipped because content extraction was unsupported: ${link.url}`,
                recoverable: true
              } satisfies CollectorError
            };
          }

          return {
            item: {
              externalId: article.canonicalUrl ?? article.finalUrl,
              sourceId: source.id,
              title: article.title ?? link.title,
              url: article.finalUrl,
              summary: article.description ?? article.text?.slice(0, 500) ?? null,
              author: article.author,
              publishedAt: article.publishedAt,
              rawContent: sourceConfig.allow_full_text ? article.text : article.description,
              metadata: {
                ingestion_method: "discovery_page",
                discovery_page_url: source.url,
                extraction_status: article.extractionStatus,
                extraction_method: article.extractionMethod,
                extraction_warnings: article.extractionWarnings,
                canonical_url: article.canonicalUrl,
                source_domain: new URL(article.finalUrl).hostname,
                fetched_at: article.fetchedAt,
                content_length: article.contentLength,
                language: article.language,
                site_name: article.siteName,
                open_graph: article.openGraph,
                quotes: article.quotes,
                links: article.links,
                sourceConfig
              },
              collectedAt: nowIso()
            } satisfies CollectorItem,
            error: null
          };
        } catch (error: unknown) {
          return {
            item: null,
            error: {
              sourceId: source.id,
              stage: "item",
              message: `Article fetch failed for ${link.url}: ${error instanceof Error ? error.message : String(error)}`,
              recoverable: true
            } satisfies CollectorError
          };
        }
      });

      for (const result of articleResults) {
        if (result.item) {
          items.push(result.item);
        }
        if (result.error) {
          errors.push(result.error);
        }
      }

      return {
        sourceId: source.id,
        ok: items.length > 0,
        items,
        errors
      };
    } catch (error: unknown) {
      return {
        sourceId: source.id,
        ok: false,
        items: [],
        errors: [{
          sourceId: source.id,
          stage: "fetch",
          message: error instanceof Error ? error.message : String(error),
          recoverable: false
        }]
      };
    }
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  let index = 0;

  async function worker(): Promise<void> {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;
      results[currentIndex] = await mapper(items[currentIndex]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}
