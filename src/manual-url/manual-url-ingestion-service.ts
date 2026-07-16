import type { Env } from "../domain/runtime";
import type { CollectedItem } from "../domain/collected-item";
import { sha256Hex } from "../utils/hash";
import { nowIso } from "../utils/time";
import { createRepositories } from "../storage/repositories";
import { ArticleFetcher } from "./article-fetcher";
import { ArticleExtractor } from "./article-extractor";
import type { ManualUrlPreview } from "./types";

export class ManualUrlIngestionService {
  constructor(
    private readonly fetcher = new ArticleFetcher(),
    private readonly extractor = new ArticleExtractor()
  ) {}

  async preview(env: Env, url: string, submittedBy: string): Promise<ManualUrlPreview & { pendingId: string }> {
    const fetched = await this.fetcher.fetch(url);
    const article = this.extractor.extract(url, fetched);
    const repos = createRepositories(env.DB);
    const duplicate = await repos.collectedItems.findDuplicateByCanonicalUrl(article.canonicalUrl);
    const pending = await repos.pendingManualUrls.create(article, submittedBy, duplicate?.id ?? null);

    return {
      article,
      duplicateItemId: duplicate?.id ?? null,
      pendingId: pending.id
    };
  }

  async confirm(env: Env, pendingId: string): Promise<{ inserted: boolean; itemId: string; title: string }> {
    const repos = createRepositories(env.DB);
    const pending = await repos.pendingManualUrls.getById(pendingId);

    if (!pending) {
      throw new Error("Pending manual URL was not found or expired.");
    }

    if (pending.extraction_status === "unsupported" || pending.extraction_status === "rejected") {
      throw new Error(`Manual URL cannot be saved with status: ${pending.extraction_status}`);
    }

    const metadata = pending.metadata_json ? JSON.parse(pending.metadata_json) as Record<string, unknown> : {};
    const item: CollectedItem = {
      externalId: pending.canonical_url,
      sourceId: "src_manual_urls",
      title: pending.title ?? pending.canonical_url ?? pending.url,
      url: pending.final_url ?? pending.url,
      canonicalUrl: pending.canonical_url ?? pending.final_url ?? pending.url,
      summary: pending.description,
      author: pending.author,
      publishedAt: pending.published_at,
      rawContent: pending.extracted_text,
      metadata: {
        ...metadata,
        ingestion_method: "manual_url",
        submitted_by: pending.submitted_by,
        submitted_at: pending.submitted_at,
        extraction_status: pending.extraction_status,
        extraction_method: pending.extraction_method,
        canonical_url: pending.canonical_url,
        source_domain: pending.final_url ? new URL(pending.final_url).hostname : null,
        fetched_at: pending.fetched_at,
        content_length: pending.content_length,
        extraction_warnings: pending.extraction_warnings_json ? JSON.parse(pending.extraction_warnings_json) : []
      },
      collectedAt: nowIso(),
      contentHash: await sha256Hex([pending.canonical_url, pending.title, pending.description, pending.extracted_text].join("\n"))
    };
    const result = await repos.collectedItems.upsertCollectedItem(item);
    await repos.pendingManualUrls.updateStatus(pendingId, result.inserted ? "accepted" : "accepted");

    return {
      inserted: result.inserted,
      itemId: result.id,
      title: item.title
    };
  }
}
