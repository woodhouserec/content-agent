import type { D1Database } from "../domain/runtime";

export interface DraftRecord {
  id: string;
  topic_id: string;
  parent_draft_id: string | null;
  telegram_chat_id: string | null;
  status: string;
  version: number;
  content: string;
  prompt_json: string | null;
  model: string | null;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  rejected_at: string | null;
}

export class DraftsRepository {
  constructor(private readonly db: D1Database) {}

  async count(): Promise<number> {
    const row = await this.db.prepare("SELECT COUNT(*) AS count FROM drafts").first<{ count: number }>();
    return row?.count ?? 0;
  }
}
