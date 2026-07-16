import type { D1Database } from "../domain/runtime";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";

export interface DraftBriefRecord {
  id: string;
  topic_id: string;
  central_thesis: string;
  author_position: string;
  supporting_points_json: string;
  source_facts_json: string;
  practical_takeaway: string;
  target_audience: string;
  desired_length: string;
  tone: string;
  factual_constraints_json: string;
  source_item_ids_json: string;
  status: string;
  prompt_version: string | null;
  generation_metadata_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateDraftBriefInput {
  topicId: string;
  centralThesis: string;
  authorPosition: string;
  supportingPoints: string[];
  sourceFacts: string[];
  practicalTakeaway: string;
  targetAudience: string;
  desiredLength: string;
  tone: string;
  factualConstraints: string[];
  sourceItemIds: string[];
  status?: string;
  promptVersion: string;
  generationMetadata?: unknown;
}

export class DraftBriefsRepository {
  constructor(private readonly db: D1Database) {}

  async getById(id: string): Promise<DraftBriefRecord | null> {
    return this.db.prepare("SELECT * FROM draft_briefs WHERE id = ? LIMIT 1").bind(id).first<DraftBriefRecord>();
  }

  async getLatestForTopic(topicId: string): Promise<DraftBriefRecord | null> {
    return this.db
      .prepare("SELECT * FROM draft_briefs WHERE topic_id = ? AND status = 'ready' ORDER BY created_at DESC LIMIT 1")
      .bind(topicId)
      .first<DraftBriefRecord>();
  }

  async create(input: CreateDraftBriefInput): Promise<DraftBriefRecord> {
    const id = createId("brief");
    const timestamp = nowIso();

    await this.db
      .prepare(
        `INSERT INTO draft_briefs (
          id, topic_id, central_thesis, author_position, supporting_points_json,
          source_facts_json, practical_takeaway, target_audience, desired_length,
          tone, factual_constraints_json, source_item_ids_json, status,
          prompt_version, generation_metadata_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        input.topicId,
        input.centralThesis,
        input.authorPosition,
        JSON.stringify(input.supportingPoints),
        JSON.stringify(input.sourceFacts),
        input.practicalTakeaway,
        input.targetAudience,
        input.desiredLength,
        input.tone,
        JSON.stringify(input.factualConstraints),
        JSON.stringify(input.sourceItemIds),
        input.status ?? "ready",
        input.promptVersion,
        input.generationMetadata ? JSON.stringify(input.generationMetadata) : null,
        timestamp,
        timestamp
      )
      .run();

    const record = await this.getById(id);
    if (!record) {
      throw new Error("Draft brief was not created");
    }

    return record;
  }
}
