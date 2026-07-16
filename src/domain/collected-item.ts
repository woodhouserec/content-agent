export interface CollectedItem {
  externalId: string | null;
  sourceId: string;
  title: string;
  url: string;
  canonicalUrl: string;
  summary: string | null;
  author: string | null;
  publishedAt: string | null;
  rawContent: string | null;
  metadata: Record<string, unknown>;
  collectedAt: string;
  contentHash: string;
}
