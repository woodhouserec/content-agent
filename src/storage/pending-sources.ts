import type { D1Database } from "../domain/runtime";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";

export interface PendingSourceRecord {
  id: string;
  url: string;
  normalized_url: string;
  status: "pending" | "confirmed" | "unsupported" | "expired";
  detected_type: "rss" | "atom" | "unsupported" | null;
  feed_title: string | null;
  preview_json: string | null;
  error_message: string | null;
  created_by_telegram_user_id: string;
  created_at: string;
  expires_at: string;
}

export interface CreatePendingSourceInput {
  url: string;
  normalizedUrl: string;
  status: PendingSourceRecord["status"];
  detectedType: PendingSourceRecord["detected_type"];
  feedTitle: string | null;
  preview: unknown;
  errorMessage: string | null;
  telegramUserId: string;
}

export class PendingSourcesRepository {
  constructor(private readonly db: D1Database) {}

  async create(input: CreatePendingSourceInput): Promise<PendingSourceRecord> {
    const now = new Date();
    const record: PendingSourceRecord = {
      id: createId("pending_src"),
      url: input.url,
      normalized_url: input.normalizedUrl,
      status: input.status,
      detected_type: input.detectedType,
      feed_title: input.feedTitle,
      preview_json: JSON.stringify(input.preview),
      error_message: input.errorMessage,
      created_by_telegram_user_id: input.telegramUserId,
      created_at: now.toISOString(),
      expires_at: new Date(now.getTime() + 30 * 60 * 1000).toISOString()
    };

    await this.db
      .prepare(
        `INSERT OR REPLACE INTO pending_sources (
          id, url, normalized_url, status, detected_type, feed_title, preview_json,
          error_message, created_by_telegram_user_id, created_at, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        record.id,
        record.url,
        record.normalized_url,
        record.status,
        record.detected_type,
        record.feed_title,
        record.preview_json,
        record.error_message,
        record.created_by_telegram_user_id,
        record.created_at,
        record.expires_at
      )
      .run();

    return record;
  }

  async getById(id: string): Promise<PendingSourceRecord | null> {
    return this.db.prepare("SELECT * FROM pending_sources WHERE id = ? LIMIT 1").bind(id).first<PendingSourceRecord>();
  }

  async markConfirmed(id: string): Promise<void> {
    await this.db.prepare("UPDATE pending_sources SET status = ? WHERE id = ?").bind("confirmed", id).run();
  }
}
