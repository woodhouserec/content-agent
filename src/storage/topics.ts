import type { D1Database } from "../domain/runtime";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";

export interface TopicRecord {
  id: string;
  processing_run_id: string | null;
  title: string;
  angle: string | null;
  summary: string | null;
  source_item_ids_json: string;
  relevance_score: number;
  why_it_matters: string | null;
  suggested_angle: string | null;
  target_audience: string | null;
  novelty_score: number | null;
  topic_fingerprint: string | null;
  ai_reasoning_summary: string | null;
  status: string;
  sent_to_telegram_at: string | null;
  selected_by_user_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTopicInput {
  title: string;
  summary: string;
  whyItMatters: string;
  suggestedAngle: string;
  targetAudience: string;
  sourceItemIds: string[];
  relevanceScore: number;
  noveltyScore: number;
  topicFingerprint: string;
  aiReasoningSummary: string | null;
}

export class TopicsRepository {
  constructor(private readonly db: D1Database) {}

  async countByStatus(status: string): Promise<number> {
    const row = await this.db
      .prepare("SELECT COUNT(*) AS count FROM topics WHERE status = ?")
      .bind(status)
      .first<{ count: number }>();

    return row?.count ?? 0;
  }

  async createIfNotExists(input: CreateTopicInput): Promise<{ inserted: boolean; id: string }> {
    const existing = await this.db
      .prepare("SELECT id FROM topics WHERE topic_fingerprint = ? LIMIT 1")
      .bind(input.topicFingerprint)
      .first<{ id: string }>();

    if (existing) {
      return {
        inserted: false,
        id: existing.id
      };
    }

    const id = createId("topic");
    const timestamp = nowIso();

    await this.db
      .prepare(
        `INSERT INTO topics (
          id, processing_run_id, title, angle, summary, source_item_ids_json,
          relevance_score, why_it_matters, suggested_angle, target_audience,
          novelty_score, topic_fingerprint, ai_reasoning_summary, status,
          sent_to_telegram_at, selected_by_user_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        null,
        input.title,
        input.suggestedAngle,
        input.summary,
        JSON.stringify(input.sourceItemIds),
        input.relevanceScore,
        input.whyItMatters,
        input.suggestedAngle,
        input.targetAudience,
        input.noveltyScore,
        input.topicFingerprint,
        input.aiReasoningSummary,
        "candidate",
        null,
        null,
        timestamp,
        timestamp
      )
      .run();

    return {
      inserted: true,
      id
    };
  }

  async listAvailable(limit: number): Promise<TopicRecord[]> {
    const result = await this.db
      .prepare(
        `SELECT * FROM topics
         WHERE status IN ('candidate', 'sent')
         ORDER BY relevance_score DESC, created_at DESC
         LIMIT ?`
      )
      .bind(limit)
      .all<TopicRecord>();

    return result.results ?? [];
  }

  async getById(id: string): Promise<TopicRecord | null> {
    return this.db.prepare("SELECT * FROM topics WHERE id = ? LIMIT 1").bind(id).first<TopicRecord>();
  }

  async markSent(id: string): Promise<void> {
    await this.db
      .prepare("UPDATE topics SET status = ?, sent_to_telegram_at = ?, updated_at = ? WHERE id = ?")
      .bind("sent", nowIso(), nowIso(), id)
      .run();
  }

  async updateStatus(id: string, status: "selected" | "skipped" | "archived"): Promise<void> {
    const selectedAt = status === "selected" ? nowIso() : null;

    await this.db
      .prepare(
        `UPDATE topics
         SET status = ?,
             selected_by_user_at = COALESCE(?, selected_by_user_at),
             updated_at = ?
         WHERE id = ?`
      )
      .bind(status, selectedAt, nowIso(), id)
      .run();
  }
}
