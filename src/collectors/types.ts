import type { SourceRecord } from "../storage/sources";

export interface CollectorConfig {
  maxItemsPerSource: number;
  timeoutMs: number;
  retries: number;
  userAgent: string;
}

export interface CollectorItem {
  externalId: string | null;
  sourceId: string;
  title: string;
  url: string;
  summary: string | null;
  author: string | null;
  publishedAt: string | null;
  rawContent: string | null;
  metadata: Record<string, unknown>;
  collectedAt: string;
}

export interface CollectorError {
  sourceId: string;
  stage: "fetch" | "parse" | "item" | "config";
  message: string;
  recoverable: boolean;
}

export interface CollectorResult {
  sourceId: string;
  ok: boolean;
  items: CollectorItem[];
  errors: CollectorError[];
}

export interface Collector {
  readonly type: SourceRecord["type"];
  collect(source: SourceRecord, config: CollectorConfig): Promise<CollectorResult>;
}

export interface SourceConfig {
  limit?: number;
  subreddit?: string;
  listing?: "hot" | "new" | "top";
  timeframe?: "hour" | "day" | "week" | "month" | "year" | "all";
  allowedSubreddits?: string[];
}
