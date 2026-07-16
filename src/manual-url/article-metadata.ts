import type { ExtractedArticle } from "./types";
import { nowIso } from "../utils/time";

export function articleToMetadata(article: ExtractedArticle, submittedBy: string): Record<string, unknown> {
  return {
    ingestion_method: "manual_url",
    submitted_by: submittedBy,
    submitted_at: nowIso(),
    extraction_status: article.extractionStatus,
    extraction_method: article.extractionMethod,
    canonical_url: article.canonicalUrl,
    source_domain: new URL(article.finalUrl).hostname,
    fetched_at: article.fetchedAt,
    content_length: article.contentLength,
    extraction_warnings: article.extractionWarnings,
    language: article.language,
    site_name: article.siteName,
    open_graph: article.openGraph,
    sourceConfig: {
      author_name: article.siteName ?? new URL(article.finalUrl).hostname,
      source_tier: "discovery",
      content_kind: "news",
      language: article.language ?? "unknown",
      topic_tags: [],
      trust_score: 55,
      editorial_priority: 2,
      max_content_age_days: 14,
      allow_full_text: false,
      license_notes: "Manual URL metadata and excerpts only.",
      max_items_per_run: 0
    }
  };
}
