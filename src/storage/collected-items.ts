import type { D1Database } from "../domain/runtime";

export interface CollectedItemRecord {
  id: string;
  source_id: string;
  external_id: string | null;
  url: string;
  title: string;
  summary: string | null;
  raw_content: string | null;
  normalized_content: string | null;
  author: string | null;
  published_at: string | null;
  collected_at: string;
  content_hash: string;
  relevance_score: number | null;
  status: string;
  metadata_json: string | null;
}

export class CollectedItemsRepository {
  constructor(private readonly db: D1Database) {}

  async count(): Promise<number> {
    const row = await this.db.prepare("SELECT COUNT(*) AS count FROM collected_items").first<{ count: number }>();
    return row?.count ?? 0;
  }
}
