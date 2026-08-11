import type { D1Database } from "../domain/runtime";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";

export interface VisualBriefRecord {
  id: string;
  topic_id: string;
  draft_id: string;
  concept: string;
  metaphor: string | null;
  composition: string | null;
  style: string | null;
  color_direction: string | null;
  aspect_ratio: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface VisualAssetRecord {
  id: string;
  visual_brief_id: string;
  storage_key: string;
  mime_type: string;
  width: number;
  height: number;
  generation_provider: string | null;
  generation_model: string | null;
  generation_prompt: string | null;
  version: number;
  parent_asset_id: string | null;
  status: string;
  created_at: string;
  approved_at: string | null;
  rejected_at: string | null;
}

export class VisualsRepository {
  constructor(private readonly db: D1Database) {}

  async getLatestBriefForDraft(draftId: string): Promise<VisualBriefRecord | null> {
    return this.db
      .prepare("SELECT * FROM visual_briefs WHERE draft_id = ? ORDER BY created_at DESC LIMIT 1")
      .bind(draftId)
      .first<VisualBriefRecord>();
  }

  async createBrief(input: {
    topicId: string;
    draftId: string;
    concept: string;
    metaphor: string | null;
    composition: string | null;
    style: string | null;
    colorDirection: string | null;
    aspectRatio: string;
  }): Promise<VisualBriefRecord> {
    const id = createId("vbrief");
    const timestamp = nowIso();

    await this.db
      .prepare(
        `INSERT INTO visual_briefs (
          id, topic_id, draft_id, concept, metaphor, composition, style,
          color_direction, aspect_ratio, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        input.topicId,
        input.draftId,
        input.concept,
        input.metaphor,
        input.composition,
        input.style,
        input.colorDirection,
        input.aspectRatio,
        "ready",
        timestamp,
        timestamp
      )
      .run();

    const brief = await this.getBriefById(id);
    if (!brief) {
      throw new Error("Visual brief was not created");
    }

    return brief;
  }

  async getBriefById(id: string): Promise<VisualBriefRecord | null> {
    return this.db.prepare("SELECT * FROM visual_briefs WHERE id = ? LIMIT 1").bind(id).first<VisualBriefRecord>();
  }

  async getAssetById(id: string): Promise<VisualAssetRecord | null> {
    return this.db.prepare("SELECT * FROM visual_assets WHERE id = ? LIMIT 1").bind(id).first<VisualAssetRecord>();
  }

  async getLatestAssetForDraft(draftId: string): Promise<VisualAssetRecord | null> {
    return this.db
      .prepare(
        `SELECT a.*
         FROM visual_assets a
         INNER JOIN visual_briefs b ON b.id = a.visual_brief_id
         WHERE b.draft_id = ?
         ORDER BY a.version DESC, a.created_at DESC
         LIMIT 1`
      )
      .bind(draftId)
      .first<VisualAssetRecord>();
  }

  async getAssetsForDraft(draftId: string): Promise<VisualAssetRecord[]> {
    const result = await this.db
      .prepare(
        `SELECT a.*
         FROM visual_assets a
         INNER JOIN visual_briefs b ON b.id = a.visual_brief_id
         WHERE b.draft_id = ?
         ORDER BY a.version ASC, a.created_at ASC`
      )
      .bind(draftId)
      .all<VisualAssetRecord>();

    return result.results ?? [];
  }

  async getLatestApprovedAssetForDraft(draftId: string): Promise<VisualAssetRecord | null> {
    return this.db
      .prepare(
        `SELECT a.*
         FROM visual_assets a
         INNER JOIN visual_briefs b ON b.id = a.visual_brief_id
         WHERE b.draft_id = ? AND a.status = 'approved'
         ORDER BY a.version DESC, a.approved_at DESC, a.created_at DESC
         LIMIT 1`
      )
      .bind(draftId)
      .first<VisualAssetRecord>();
  }

  async countAssetsForBrief(visualBriefId: string): Promise<number> {
    const row = await this.db
      .prepare("SELECT COUNT(*) AS count FROM visual_assets WHERE visual_brief_id = ?")
      .bind(visualBriefId)
      .first<{ count: number }>();

    return row?.count ?? 0;
  }

  async createAsset(input: {
    visualBriefId: string;
    storageKey: string;
    mimeType: string;
    width: number;
    height: number;
    generationProvider: string;
    generationModel: string;
    generationPrompt: string;
    parentAssetId?: string | null;
  }): Promise<VisualAssetRecord> {
    const id = createId("vasset");
    const timestamp = nowIso();
    const version = await this.countAssetsForBrief(input.visualBriefId) + 1;

    await this.db
      .prepare(
        `INSERT INTO visual_assets (
          id, visual_brief_id, storage_key, mime_type, width, height,
          generation_provider, generation_model, generation_prompt, version,
          parent_asset_id, status, created_at, approved_at, rejected_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        input.visualBriefId,
        input.storageKey,
        input.mimeType,
        input.width,
        input.height,
        input.generationProvider,
        input.generationModel,
        input.generationPrompt,
        version,
        input.parentAssetId ?? null,
        "generated",
        timestamp,
        null,
        null
      )
      .run();

    const asset = await this.getAssetById(id);
    if (!asset) {
      throw new Error("Visual asset was not created");
    }

    return asset;
  }

  async updateAssetStatus(id: string, status: "approved" | "rejected"): Promise<void> {
    const timestamp = nowIso();
    await this.db
      .prepare(
        `UPDATE visual_assets
         SET status = ?,
             approved_at = CASE WHEN ? = 'approved' THEN ? ELSE approved_at END,
             rejected_at = CASE WHEN ? = 'rejected' THEN ? ELSE rejected_at END
         WHERE id = ?`
      )
      .bind(status, status, timestamp, status, timestamp, id)
      .run();
  }
}
