import type { D1Database } from "../domain/runtime";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";

export type SourceType = "rss" | "reddit";

export interface SourceRecord {
  id: string;
  type: SourceType;
  name: string;
  url: string;
  config_json: string | null;
  enabled: number;
  created_at: string;
  updated_at: string;
}

export interface CreateSourceInput {
  type: SourceType;
  name: string;
  url: string;
  config: Record<string, unknown>;
  enabled: boolean;
}

export class SourcesRepository {
  constructor(private readonly db: D1Database) {}

  async listEnabled(): Promise<SourceRecord[]> {
    const result = await this.db
      .prepare("SELECT * FROM sources WHERE enabled = 1 ORDER BY name ASC")
      .all<SourceRecord>();

    return result.results ?? [];
  }

  async listAll(): Promise<SourceRecord[]> {
    const result = await this.db.prepare("SELECT * FROM sources ORDER BY enabled DESC, name ASC").all<SourceRecord>();
    return result.results ?? [];
  }

  async getById(id: string): Promise<SourceRecord | null> {
    return this.db.prepare("SELECT * FROM sources WHERE id = ? LIMIT 1").bind(id).first<SourceRecord>();
  }

  async findByUrl(url: string): Promise<SourceRecord | null> {
    return this.db.prepare("SELECT * FROM sources WHERE url = ? LIMIT 1").bind(url).first<SourceRecord>();
  }

  async create(input: CreateSourceInput): Promise<SourceRecord> {
    const timestamp = nowIso();
    const record: SourceRecord = {
      id: createId("src"),
      type: input.type,
      name: input.name,
      url: input.url,
      config_json: JSON.stringify(input.config),
      enabled: input.enabled ? 1 : 0,
      created_at: timestamp,
      updated_at: timestamp
    };

    await this.db
      .prepare(
        `INSERT INTO sources (id, type, name, url, config_json, enabled, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(record.id, record.type, record.name, record.url, record.config_json, record.enabled, record.created_at, record.updated_at)
      .run();

    return record;
  }

  async disable(id: string): Promise<boolean> {
    const result = await this.db
      .prepare("UPDATE sources SET enabled = 0, updated_at = ? WHERE id = ?")
      .bind(nowIso(), id)
      .run();

    return Boolean(result.meta?.changes);
  }
}
