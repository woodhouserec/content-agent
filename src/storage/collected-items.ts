import type { D1Database } from "../domain/runtime";
import type { CollectedItem } from "../domain/collected-item";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";

export interface CollectedItemRecord {
  id: string;
  source_id: string;
  external_id: string | null;
  url: string;
  canonical_url: string | null;
  title: string;
  summary: string | null;
  raw_content: string | null;
  normalized_content: string | null;
  author: string | null;
  published_at: string | null;
  collected_at: string;
  last_seen_at: string | null;
  content_hash: string;
  relevance_score: number | null;
  rule_score: number | null;
  ai_score: number | null;
  final_score: number | null;
  scoring_breakdown_json: string | null;
  scored_at: string | null;
  scoring_version: string | null;
  status: string;
  metadata_json: string | null;
}

export interface UpdateScoringInput {
  id: string;
  ruleScore: number;
  aiScore: number | null;
  finalScore: number;
  scoringBreakdown: unknown;
  scoringVersion: string;
}

export interface UpsertCollectedItemResult {
  inserted: boolean;
  id: string;
}

export class CollectedItemsRepository {
  constructor(private readonly db: D1Database) {}

  async count(): Promise<number> {
    const row = await this.db.prepare("SELECT COUNT(*) AS count FROM collected_items").first<{ count: number }>();
    return row?.count ?? 0;
  }

  async upsertCollectedItem(item: CollectedItem): Promise<UpsertCollectedItemResult> {
    const existing = await this.findDuplicate(item);
    const seenAt = nowIso();

    if (existing) {
      await this.db
        .prepare(
          `UPDATE collected_items
           SET last_seen_at = ?,
               summary = COALESCE(summary, ?),
               raw_content = COALESCE(raw_content, ?),
               normalized_content = COALESCE(normalized_content, ?),
               metadata_json = COALESCE(metadata_json, ?)
           WHERE id = ?`
        )
        .bind(
          seenAt,
          item.summary,
          item.rawContent,
          item.rawContent,
          JSON.stringify(item.metadata),
          existing.id
        )
        .run();

      return {
        inserted: false,
        id: existing.id
      };
    }

    const id = createId("item");

    try {
      await this.db
        .prepare(
          `INSERT INTO collected_items (
          id, source_id, external_id, url, canonical_url, title, summary,
          raw_content, normalized_content, author, published_at, collected_at,
          last_seen_at, content_hash, relevance_score, status, metadata_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          id,
          item.sourceId,
          item.externalId,
          item.url,
          item.canonicalUrl,
          item.title,
          item.summary,
          item.rawContent,
          item.rawContent,
          item.author,
          item.publishedAt,
          item.collectedAt,
          seenAt,
          item.contentHash,
          null,
          "collected",
          JSON.stringify(item.metadata)
        )
        .run();
    } catch (error: unknown) {
      const duplicate = await this.findDuplicate(item);

      if (!duplicate) {
        throw error;
      }

      await this.touch(duplicate.id, seenAt);

      return {
        inserted: false,
        id: duplicate.id
      };
    }

    return {
      inserted: true,
      id
    };
  }

  async listRecent(limit: number): Promise<CollectedItemRecord[]> {
    const result = await this.db
      .prepare("SELECT * FROM collected_items ORDER BY collected_at DESC LIMIT ?")
      .bind(limit)
      .all<CollectedItemRecord>();

    return result.results ?? [];
  }

  async listManualUrlItems(limit: number): Promise<CollectedItemRecord[]> {
    const result = await this.db
      .prepare(
        `SELECT * FROM collected_items
         WHERE source_id = 'src_manual_urls'
            OR metadata_json LIKE '%"ingestion_method":"manual_url"%'
            OR metadata_json LIKE '%"ingestionMethod":"manual_url"%'
         ORDER BY collected_at DESC
         LIMIT ?`
      )
      .bind(limit)
      .all<CollectedItemRecord>();

    return result.results ?? [];
  }

  async listForScoring(limit: number): Promise<CollectedItemRecord[]> {
    const result = await this.db
      .prepare(
        `SELECT * FROM collected_items
         WHERE scored_at IS NULL
            OR scoring_version IS NULL
         ORDER BY collected_at DESC
         LIMIT ?`
      )
      .bind(limit)
      .all<CollectedItemRecord>();

    return result.results ?? [];
  }

  async getByIds(ids: string[]): Promise<CollectedItemRecord[]> {
    if (ids.length === 0) {
      return [];
    }

    const placeholders = ids.map(() => "?").join(", ");
    const result = await this.db
      .prepare(`SELECT * FROM collected_items WHERE id IN (${placeholders})`)
      .bind(...ids)
      .all<CollectedItemRecord>();

    return result.results ?? [];
  }

  async updateScoring(input: UpdateScoringInput): Promise<void> {
    await this.db
      .prepare(
        `UPDATE collected_items
         SET rule_score = ?,
             ai_score = ?,
             final_score = ?,
             relevance_score = ?,
             scoring_breakdown_json = ?,
             scored_at = ?,
             scoring_version = ?
         WHERE id = ?`
      )
      .bind(
        input.ruleScore,
        input.aiScore,
        input.finalScore,
        input.finalScore,
        JSON.stringify(input.scoringBreakdown),
        nowIso(),
        input.scoringVersion,
        input.id
      )
      .run();
  }

  async findDuplicateByCanonicalUrl(canonicalUrl: string): Promise<{ id: string } | null> {
    return this.db
      .prepare("SELECT id FROM collected_items WHERE canonical_url = ? LIMIT 1")
      .bind(canonicalUrl)
      .first<{ id: string }>();
  }

  private async findDuplicate(item: CollectedItem): Promise<{ id: string } | null> {
    if (item.externalId) {
      const byExternalId = await this.db
        .prepare("SELECT id FROM collected_items WHERE source_id = ? AND external_id = ? LIMIT 1")
        .bind(item.sourceId, item.externalId)
        .first<{ id: string }>();

      if (byExternalId) {
        return byExternalId;
      }
    }

    const byUrl = await this.db
      .prepare("SELECT id FROM collected_items WHERE canonical_url = ? LIMIT 1")
      .bind(item.canonicalUrl)
      .first<{ id: string }>();

    if (byUrl) {
      return byUrl;
    }

    return this.db
      .prepare("SELECT id FROM collected_items WHERE content_hash = ? LIMIT 1")
      .bind(item.contentHash)
      .first<{ id: string }>();
  }

  private async touch(id: string, seenAt: string): Promise<void> {
    await this.db
      .prepare("UPDATE collected_items SET last_seen_at = ? WHERE id = ?")
      .bind(seenAt, id)
      .run();
  }
}
