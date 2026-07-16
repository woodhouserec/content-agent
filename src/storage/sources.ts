import type { D1Database } from "../domain/runtime";

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

export class SourcesRepository {
  constructor(private readonly db: D1Database) {}

  async listEnabled(): Promise<SourceRecord[]> {
    const result = await this.db
      .prepare("SELECT * FROM sources WHERE enabled = 1 ORDER BY name ASC")
      .all<SourceRecord>();

    return result.results ?? [];
  }
}
