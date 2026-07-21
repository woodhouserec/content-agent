import type { D1Database } from "../domain/runtime";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";

export interface RelevanceProfileRecord {
  id: string;
  name: string;
  role: string;
  focus_json: string;
  audience_json: string;
  tone: string;
  position: string;
  min_rule_score: number;
  min_final_score_for_topic: number;
  is_active: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface RelevanceProfileInput {
  name: string;
  role: string;
  focus: string[];
  audience: string[];
  tone: string;
  position: string;
  minRuleScore: number;
  minFinalScoreForTopic: number;
}

export class RelevanceProfilesRepository {
  constructor(private readonly db: D1Database) {}

  async getActive(): Promise<RelevanceProfileRecord | null> {
    return this.db
      .prepare("SELECT * FROM relevance_profiles WHERE is_active = 1 AND deleted_at IS NULL ORDER BY updated_at DESC LIMIT 1")
      .first<RelevanceProfileRecord>();
  }

  async listActive(): Promise<RelevanceProfileRecord[]> {
    const result = await this.db
      .prepare("SELECT * FROM relevance_profiles WHERE deleted_at IS NULL ORDER BY is_active DESC, name ASC")
      .all<RelevanceProfileRecord>();
    return result.results ?? [];
  }

  async getById(id: string): Promise<RelevanceProfileRecord | null> {
    return this.db.prepare("SELECT * FROM relevance_profiles WHERE id = ? AND deleted_at IS NULL LIMIT 1").bind(id).first<RelevanceProfileRecord>();
  }

  async create(input: RelevanceProfileInput, activate = false): Promise<RelevanceProfileRecord> {
    const id = createId("profile");
    const timestamp = nowIso();

    if (activate) {
      await this.db.prepare("UPDATE relevance_profiles SET is_active = 0 WHERE deleted_at IS NULL").run();
    }

    await this.db
      .prepare(
        `INSERT INTO relevance_profiles (
          id, name, role, focus_json, audience_json, tone, position,
          min_rule_score, min_final_score_for_topic, is_active, created_at, updated_at, deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        input.name,
        input.role,
        JSON.stringify(input.focus),
        JSON.stringify(input.audience),
        input.tone,
        input.position,
        input.minRuleScore,
        input.minFinalScoreForTopic,
        activate ? 1 : 0,
        timestamp,
        timestamp,
        null
      )
      .run();

    const profile = await this.getById(id);
    if (!profile) {
      throw new Error("Profile was not created");
    }

    return profile;
  }

  async update(id: string, input: RelevanceProfileInput): Promise<RelevanceProfileRecord> {
    await this.db
      .prepare(
        `UPDATE relevance_profiles
         SET name = ?, role = ?, focus_json = ?, audience_json = ?, tone = ?,
             position = ?, min_rule_score = ?, min_final_score_for_topic = ?, updated_at = ?
         WHERE id = ? AND deleted_at IS NULL`
      )
      .bind(
        input.name,
        input.role,
        JSON.stringify(input.focus),
        JSON.stringify(input.audience),
        input.tone,
        input.position,
        input.minRuleScore,
        input.minFinalScoreForTopic,
        nowIso(),
        id
      )
      .run();

    const profile = await this.getById(id);
    if (!profile) {
      throw new Error("Profile was not updated");
    }

    return profile;
  }

  async activate(id: string): Promise<boolean> {
    const profile = await this.getById(id);
    if (!profile) {
      return false;
    }

    await this.db.prepare("UPDATE relevance_profiles SET is_active = 0 WHERE deleted_at IS NULL").run();
    await this.db.prepare("UPDATE relevance_profiles SET is_active = 1, updated_at = ? WHERE id = ?").bind(nowIso(), id).run();
    return true;
  }

  async softDelete(id: string): Promise<boolean> {
    const active = await this.getActive();
    if (active?.id === id) {
      return false;
    }

    const result = await this.db
      .prepare("UPDATE relevance_profiles SET deleted_at = ?, is_active = 0, updated_at = ? WHERE id = ? AND deleted_at IS NULL")
      .bind(nowIso(), nowIso(), id)
      .run();

    return Boolean(result.meta?.changes);
  }
}

export function parseProfileArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}
