import type { SourceRecord } from "../storage/sources";
import { normalizeWhitespace, truncateText } from "../utils/text";
import { nowIso } from "../utils/time";
import { getSourceLimit, parseSourceConfig } from "./config";
import { fetchTextWithRetry } from "./http";
import type { Collector, CollectorConfig, CollectorResult } from "./types";

interface RedditListing {
  data?: {
    children?: RedditChild[];
  };
}

interface RedditChild {
  data?: {
    id?: string;
    name?: string;
    subreddit?: string;
    title?: string;
    selftext?: string;
    author?: string;
    created_utc?: number;
    permalink?: string;
    url?: string;
    score?: number;
    num_comments?: number;
    upvote_ratio?: number;
  };
}

export class RedditCollector implements Collector {
  readonly type = "reddit" as const;

  async collect(source: SourceRecord, config: CollectorConfig): Promise<CollectorResult> {
    const sourceConfig = parseSourceConfig(source.config_json);
    const subreddit = sourceConfig.subreddit;
    const allowed = sourceConfig.allowedSubreddits ?? [];

    if (!subreddit || !allowed.includes(subreddit)) {
      return {
        sourceId: source.id,
        ok: false,
        items: [],
        errors: [
          {
            sourceId: source.id,
            stage: "config",
            message: "Reddit source skipped because subreddit is missing from allowedSubreddits.",
            recoverable: false
          }
        ]
      };
    }

    const limit = getSourceLimit(source.config_json, config.maxItemsPerSource, config.maxItemsPerSource);
    const url = buildRedditUrl(source.url, limit);

    try {
      const responseText = await fetchTextWithRetry(url, {
        timeoutMs: config.timeoutMs,
        retries: config.retries,
        userAgent: config.userAgent,
        accept: "application/json"
      });
      const listing = JSON.parse(responseText) as RedditListing;
      const children = listing.data?.children ?? [];
      const items = children.slice(0, limit).flatMap((child) => {
        const item = child.data;

        if (!item?.title || !item.permalink) {
          return [];
        }

        const permalink = `https://www.reddit.com${item.permalink}`;
        const text = normalizeWhitespace(item.selftext);

        return [
          {
            externalId: item.name ?? item.id ?? null,
            sourceId: source.id,
            title: item.title,
            url: permalink,
            summary: truncateText(text, 500),
            author: item.author ?? null,
            publishedAt: typeof item.created_utc === "number"
              ? new Date(item.created_utc * 1000).toISOString()
              : null,
            rawContent: truncateText(text, 4000),
            metadata: {
              platform: "reddit",
              subreddit: item.subreddit ?? subreddit,
              outboundUrl: item.url ?? null,
              score: item.score ?? null,
              commentsCount: item.num_comments ?? null,
              upvoteRatio: item.upvote_ratio ?? null
            },
            collectedAt: nowIso()
          }
        ];
      });

      return {
        sourceId: source.id,
        ok: true,
        items,
        errors: []
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

function buildRedditUrl(sourceUrl: string, limit: number): string {
  const url = new URL(sourceUrl);
  url.searchParams.set("limit", String(limit));
  return url.toString();
}
