import type { D1Database } from "../domain/runtime";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";

export interface ConversationStateRecord {
  id: string;
  telegram_user_id: string;
  telegram_chat_id: string;
  state_type: string;
  target_type: string;
  target_id: string;
  payload_json: string | null;
  created_at: string;
  expires_at: string;
}

export class ConversationStatesRepository {
  constructor(private readonly db: D1Database) {}

  async set(input: {
    telegramUserId: string;
    telegramChatId: string;
    stateType: string;
    targetType: string;
    targetId: string;
    payload?: unknown;
    ttlMinutes: number;
  }): Promise<void> {
    const now = Date.now();
    const expiresAt = new Date(now + input.ttlMinutes * 60_000).toISOString();

    await this.clear(input.telegramUserId, input.stateType);
    await this.db
      .prepare(
        `INSERT INTO conversation_states (
          id, telegram_user_id, telegram_chat_id, state_type, target_type,
          target_id, payload_json, created_at, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        createId("state"),
        input.telegramUserId,
        input.telegramChatId,
        input.stateType,
        input.targetType,
        input.targetId,
        input.payload ? JSON.stringify(input.payload) : null,
        nowIso(),
        expiresAt
      )
      .run();
  }

  async getActive(telegramUserId: string, stateType: string): Promise<ConversationStateRecord | null> {
    return this.db
      .prepare(
        `SELECT * FROM conversation_states
         WHERE telegram_user_id = ? AND state_type = ? AND expires_at > ?
         ORDER BY created_at DESC LIMIT 1`
      )
      .bind(telegramUserId, stateType, nowIso())
      .first<ConversationStateRecord>();
  }

  async clear(telegramUserId: string, stateType: string): Promise<void> {
    await this.db
      .prepare("DELETE FROM conversation_states WHERE telegram_user_id = ? AND state_type = ?")
      .bind(telegramUserId, stateType)
      .run();
  }
}
