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
  memory_json: string;
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
  memory?: PreferenceMemory;
}

export interface PreferenceMemory {
  writing_preferences: string[];
  visual_preferences: string[];
  topic_preferences: string[];
  avoid: string[];
  material_filter?: {
    max_content_age_days: number;
  } | null;
  thesis_filter?: {
    max_topics_per_run: number;
  } | null;
  updated_at: string | null;
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
          min_rule_score, min_final_score_for_topic, memory_json, is_active, created_at, updated_at, deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
        JSON.stringify(input.memory ?? emptyPreferenceMemory()),
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
             position = ?, min_rule_score = ?, min_final_score_for_topic = ?,
             memory_json = COALESCE(?, memory_json),
             updated_at = ?
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
        input.memory ? JSON.stringify(input.memory) : null,
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

  async updateMemory(id: string, memory: PreferenceMemory): Promise<void> {
    await this.db
      .prepare("UPDATE relevance_profiles SET memory_json = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL")
      .bind(JSON.stringify(memory), nowIso(), id)
      .run();
  }

  async updateScoringThresholds(id: string, input: { minRuleScore: number; minFinalScoreForTopic: number }): Promise<RelevanceProfileRecord> {
    await this.db
      .prepare(
        `UPDATE relevance_profiles
         SET min_rule_score = ?,
             min_final_score_for_topic = ?,
             updated_at = ?
         WHERE id = ? AND deleted_at IS NULL`
      )
      .bind(input.minRuleScore, input.minFinalScoreForTopic, nowIso(), id)
      .run();

    const profile = await this.getById(id);
    if (!profile) {
      throw new Error("Profile thresholds were not updated");
    }

    return profile;
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

export function emptyPreferenceMemory(): PreferenceMemory {
  return {
    writing_preferences: [],
    visual_preferences: [],
    topic_preferences: [],
    avoid: [],
    material_filter: null,
    updated_at: null
  };
}

export function parsePreferenceMemory(value: string | null | undefined): PreferenceMemory {
  if (!value) {
    return emptyPreferenceMemory();
  }

  try {
    const parsed = JSON.parse(value) as Partial<PreferenceMemory>;
    return {
      writing_preferences: normalizeMemoryList(parsed.writing_preferences),
      visual_preferences: normalizeMemoryList(parsed.visual_preferences),
      topic_preferences: normalizeMemoryList(parsed.topic_preferences),
      avoid: normalizeMemoryList(parsed.avoid),
      material_filter: normalizeMaterialFilter(parsed.material_filter),
      thesis_filter: normalizeThesisFilter(parsed.thesis_filter),
      updated_at: typeof parsed.updated_at === "string" ? parsed.updated_at : null
    };
  } catch {
    return emptyPreferenceMemory();
  }
}

function normalizeMaterialFilter(value: unknown): PreferenceMemory["material_filter"] {
  if (!value || typeof value !== "object") {
    return null;
  }

  const maxContentAgeDays = Number((value as { max_content_age_days?: unknown }).max_content_age_days);
  if (![1, 3, 5, 7].includes(maxContentAgeDays)) {
    return null;
  }

  return {
    max_content_age_days: maxContentAgeDays
  };
}

function normalizeThesisFilter(value: unknown): PreferenceMemory["thesis_filter"] {
  if (!value || typeof value !== "object") {
    return null;
  }

  const maxTopicsPerRun = Number((value as { max_topics_per_run?: unknown }).max_topics_per_run);
  if (!Number.isInteger(maxTopicsPerRun) || maxTopicsPerRun < 1) {
    return null;
  }

  return {
    max_topics_per_run: maxTopicsPerRun
  };
}

function normalizeMemoryList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 10)
    : [];
}

export function parseProfileArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}
