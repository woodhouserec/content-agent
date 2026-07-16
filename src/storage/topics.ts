import type { D1Database } from "../domain/runtime";

export interface TopicRecord {
  id: string;
  processing_run_id: string | null;
  title: string;
  angle: string | null;
  summary: string | null;
  source_item_ids_json: string;
  relevance_score: number;
  status: string;
  sent_to_telegram_at: string | null;
  selected_by_user_at: string | null;
  created_at: string;
  updated_at: string;
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
}
