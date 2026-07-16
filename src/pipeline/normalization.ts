import type { CollectorItem } from "../collectors/types";
import type { CollectedItem } from "../domain/collected-item";
import { sha256Hex } from "../utils/hash";
import { normalizeWhitespace, stripHtml, truncateText } from "../utils/text";
import { canonicalizeUrl } from "../utils/url";

const MAX_TITLE_LENGTH = 300;
const MAX_SUMMARY_LENGTH = 1000;
const MAX_RAW_CONTENT_LENGTH = 8000;

export async function normalizeCollectorItem(item: CollectorItem): Promise<CollectedItem> {
  const canonicalUrl = canonicalizeUrl(item.url);
  const title = truncateText(normalizeWhitespace(stripHtml(item.title)) ?? "Untitled", MAX_TITLE_LENGTH) ?? "Untitled";
  const summary = truncateText(normalizeWhitespace(stripHtml(item.summary)), MAX_SUMMARY_LENGTH);
  const rawContent = truncateText(normalizeWhitespace(stripHtml(item.rawContent)), MAX_RAW_CONTENT_LENGTH);
  const author = truncateText(normalizeWhitespace(stripHtml(item.author)), 200);
  const contentHash = await sha256Hex([
    item.sourceId,
    canonicalUrl,
    title,
    summary ?? "",
    rawContent ?? ""
  ].join("\n"));

  return {
    externalId: item.externalId,
    sourceId: item.sourceId,
    title,
    url: item.url,
    canonicalUrl,
    summary,
    author,
    publishedAt: item.publishedAt,
    rawContent,
    metadata: item.metadata,
    collectedAt: item.collectedAt,
    contentHash
  };
}

export async function normalizeCollectorItems(items: CollectorItem[]): Promise<CollectedItem[]> {
  const normalized: CollectedItem[] = [];

  for (const item of items) {
    normalized.push(await normalizeCollectorItem(item));
  }

  return normalized;
}
