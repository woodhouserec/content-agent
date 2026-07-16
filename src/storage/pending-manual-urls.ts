import type { D1Database } from "../domain/runtime";
import type { ExtractedArticle, ExtractionStatus } from "../manual-url/types";
import { articleToMetadata } from "../manual-url/article-metadata";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";

export interface PendingManualUrlRecord {
  id: string;
  url: string;
  final_url: string | null;
  canonical_url: string | null;
  title: string | null;
  author: string | null;
  published_at: string | null;
  description: string | null;
  extracted_text: string | null;
  language: string | null;
  site_name: string | null;
  metadata_json: string | null;
  extraction_status: ExtractionStatus;
  extraction_method: string;
  extraction_warnings_json: string | null;
  submitted_by: string;
  submitted_at: string;
  fetched_at: string | null;
  content_length: number;
  created_at: string;
  expires_at: string;
}

export class PendingManualUrlsRepository {
  constructor(private readonly db: D1Database) {}

  async create(article: ExtractedArticle, submittedBy: string, duplicateItemId: string | null): Promise<PendingManualUrlRecord> {
    const createdAt = nowIso();
    const record: PendingManualUrlRecord = {
      id: createId("pending_url"),
      url: article.originalUrl,
      final_url: article.finalUrl,
      canonical_url: article.canonicalUrl,
      title: article.title,
      author: article.author,
      published_at: article.publishedAt,
      description: article.description,
      extracted_text: article.text,
      language: article.language,
      site_name: article.siteName,
      metadata_json: JSON.stringify({
        ...articleToMetadata(article, submittedBy),
        duplicate_item_id: duplicateItemId
      }),
      extraction_status: article.extractionStatus,
      extraction_method: article.extractionMethod,
      extraction_warnings_json: JSON.stringify(article.extractionWarnings),
      submitted_by: submittedBy,
      submitted_at: createdAt,
      fetched_at: article.fetchedAt,
      content_length: article.contentLength,
      created_at: createdAt,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString()
    };

    await this.db
      .prepare(
        `INSERT INTO pending_manual_urls (
          id, url, final_url, canonical_url, title, author, published_at, description,
          extracted_text, language, site_name, metadata_json, extraction_status,
          extraction_method, extraction_warnings_json, submitted_by, submitted_at,
          fetched_at, content_length, created_at, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        record.id,
        record.url,
        record.final_url,
        record.canonical_url,
        record.title,
        record.author,
        record.published_at,
        record.description,
        record.extracted_text,
        record.language,
        record.site_name,
        record.metadata_json,
        record.extraction_status,
        record.extraction_method,
        record.extraction_warnings_json,
        record.submitted_by,
        record.submitted_at,
        record.fetched_at,
        record.content_length,
        record.created_at,
        record.expires_at
      )
      .run();

    return record;
  }

  async getById(id: string): Promise<PendingManualUrlRecord | null> {
    return this.db.prepare("SELECT * FROM pending_manual_urls WHERE id = ? LIMIT 1").bind(id).first<PendingManualUrlRecord>();
  }

  async updateStatus(id: string, status: ExtractionStatus): Promise<void> {
    await this.db
      .prepare("UPDATE pending_manual_urls SET extraction_status = ? WHERE id = ?")
      .bind(status, id)
      .run();
  }
}
