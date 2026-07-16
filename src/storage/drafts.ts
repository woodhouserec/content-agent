import type { D1Database } from "../domain/runtime";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";

export interface DraftRecord {
  id: string;
  topic_id: string;
  draft_brief_id: string | null;
  parent_draft_id: string | null;
  telegram_chat_id: string | null;
  status: string;
  version: number;
  content: string;
  prompt_json: string | null;
  model: string | null;
  revision_type: string | null;
  user_instruction: string | null;
  prompt_version: string | null;
  generation_metadata_json: string | null;
  source_snapshot_json: string | null;
  factual_review_json: string | null;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  rejected_at: string | null;
}

export interface CreateDraftInput {
  topicId: string;
  draftBriefId: string;
  parentDraftId?: string | null;
  telegramChatId?: string | null;
  status?: string;
  content: string;
  promptJson?: unknown;
  model: string;
  revisionType?: string | null;
  userInstruction?: string | null;
  promptVersion: string;
  generationMetadata?: unknown;
  sourceSnapshot?: unknown;
  factualReview?: unknown;
}

export class DraftsRepository {
  constructor(private readonly db: D1Database) {}

  async count(): Promise<number> {
    const row = await this.db.prepare("SELECT COUNT(*) AS count FROM drafts").first<{ count: number }>();
    return row?.count ?? 0;
  }

  async getById(id: string): Promise<DraftRecord | null> {
    return this.db.prepare("SELECT * FROM drafts WHERE id = ? LIMIT 1").bind(id).first<DraftRecord>();
  }

  async latestForTopic(topicId: string): Promise<DraftRecord | null> {
    return this.db
      .prepare("SELECT * FROM drafts WHERE topic_id = ? ORDER BY version DESC, created_at DESC LIMIT 1")
      .bind(topicId)
      .first<DraftRecord>();
  }

  async countForTopic(topicId: string): Promise<number> {
    const row = await this.db
      .prepare("SELECT COUNT(*) AS count FROM drafts WHERE topic_id = ?")
      .bind(topicId)
      .first<{ count: number }>();
    return row?.count ?? 0;
  }

  async countChildren(parentDraftId: string): Promise<number> {
    const row = await this.db
      .prepare("SELECT COUNT(*) AS count FROM drafts WHERE parent_draft_id = ?")
      .bind(parentDraftId)
      .first<{ count: number }>();
    return row?.count ?? 0;
  }

  async create(input: CreateDraftInput): Promise<DraftRecord> {
    const id = createId("draft");
    const timestamp = nowIso();
    const latest = await this.latestForTopic(input.topicId);
    const version = (latest?.version ?? 0) + 1;

    await this.db
      .prepare(
        `INSERT INTO drafts (
          id, topic_id, draft_brief_id, parent_draft_id, telegram_chat_id,
          status, version, content, prompt_json, model, revision_type,
          user_instruction, prompt_version, generation_metadata_json,
          source_snapshot_json, factual_review_json, created_at, updated_at,
          approved_at, rejected_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        input.topicId,
        input.draftBriefId,
        input.parentDraftId ?? null,
        input.telegramChatId ?? null,
        input.status ?? "draft",
        version,
        input.content,
        input.promptJson ? JSON.stringify(input.promptJson) : null,
        input.model,
        input.revisionType ?? null,
        input.userInstruction ?? null,
        input.promptVersion,
        input.generationMetadata ? JSON.stringify(input.generationMetadata) : null,
        input.sourceSnapshot ? JSON.stringify(input.sourceSnapshot) : null,
        input.factualReview ? JSON.stringify(input.factualReview) : null,
        timestamp,
        timestamp,
        null,
        null
      )
      .run();

    const record = await this.getById(id);
    if (!record) {
      throw new Error("Draft was not created");
    }

    return record;
  }

  async updateStatus(id: string, status: "approved" | "rejected" | "superseded" | "failed"): Promise<void> {
    const timestamp = nowIso();
    await this.db
      .prepare(
        `UPDATE drafts
         SET status = ?,
             approved_at = CASE WHEN ? = 'approved' THEN ? ELSE approved_at END,
             rejected_at = CASE WHEN ? = 'rejected' THEN ? ELSE rejected_at END,
             updated_at = ?
         WHERE id = ?`
      )
      .bind(status, status, timestamp, status, timestamp, timestamp, id)
      .run();
  }

  async countCreatedSince(iso: string): Promise<{ drafts: number; revisions: number }> {
    const result = await this.db
      .prepare(
        `SELECT
           SUM(CASE WHEN parent_draft_id IS NULL THEN 1 ELSE 0 END) AS drafts,
           SUM(CASE WHEN parent_draft_id IS NOT NULL THEN 1 ELSE 0 END) AS revisions
         FROM drafts
         WHERE created_at >= ?`
      )
      .bind(iso)
      .first<{ drafts: number | null; revisions: number | null }>();

    return {
      drafts: result?.drafts ?? 0,
      revisions: result?.revisions ?? 0
    };
  }
}
