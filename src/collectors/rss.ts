import type { SourceRecord } from "../storage/sources";
import { nowIso } from "../utils/time";
import { getSourceLimit, parseSourceConfig } from "./config";
import { fetchTextWithRetry } from "./http";
import type { Collector, CollectorConfig, CollectorError, CollectorItem, CollectorResult } from "./types";
import { parseFeedEntries } from "./xml";

export class RssCollector implements Collector {
  readonly type = "rss" as const;

  async collect(source: SourceRecord, config: CollectorConfig): Promise<CollectorResult> {
    const errors: CollectorError[] = [];
    const limit = getSourceLimit(source.config_json, config.maxItemsPerSource, config.maxItemsPerSource);
    const sourceConfig = parseSourceConfig(source.config_json);

    try {
      const xml = await fetchTextWithRetry(source.url, {
        timeoutMs: config.timeoutMs,
        retries: config.retries,
        userAgent: config.userAgent,
        accept: "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5"
      });

      const entries = parseFeedEntries(xml);
      const items: CollectorItem[] = [];

      for (const entry of entries.slice(0, limit)) {
        try {
          if (!entry.title || !entry.url) {
            errors.push({
              sourceId: source.id,
              stage: "item",
              message: "Feed item skipped because title or url is missing.",
              recoverable: true
            });
            continue;
          }

          items.push({
            externalId: entry.externalId,
            sourceId: source.id,
            title: entry.title,
            url: entry.url,
            summary: entry.summary,
            author: entry.author,
            publishedAt: entry.publishedAt,
            rawContent: entry.rawContent,
            metadata: {
              ...entry.metadata,
              sourceConfig
            },
            collectedAt: nowIso()
          });
        } catch (error: unknown) {
          errors.push({
            sourceId: source.id,
            stage: "item",
            message: error instanceof Error ? error.message : String(error),
            recoverable: true
          });
        }
      }

      return {
        sourceId: source.id,
        ok: errors.length === 0,
        items,
        errors
      };
    } catch (error: unknown) {
      return {
        sourceId: source.id,
        ok: false,
        items: [],
        errors: [
          {
            sourceId: source.id,
            stage: "fetch",
            message: error instanceof Error ? error.message : String(error),
            recoverable: false
          }
        ]
      };
    }
  }
}
