import type { D1Database } from "../domain/runtime";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";

export interface CreateTelegramActionInput {
  telegramUserId: string;
  telegramChatId: string;
  messageId?: string;
  callbackQueryId?: string;
  action: string;
  targetType: string;
  targetId: string;
  payload?: unknown;
  handledAt?: string;
}

export class TelegramActionsRepository {
  constructor(private readonly db: D1Database) {}

  async create(input: CreateTelegramActionInput): Promise<string> {
    const id = createId("tgact");

    await this.db
      .prepare(
        `INSERT INTO telegram_actions (
          id, telegram_user_id, telegram_chat_id, message_id, callback_query_id,
          action, target_type, target_id, payload_json, handled_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        input.telegramUserId,
        input.telegramChatId,
        input.messageId ?? null,
        input.callbackQueryId ?? null,
        input.action,
        input.targetType,
        input.targetId,
        input.payload ? JSON.stringify(input.payload) : null,
        input.handledAt ?? null,
        nowIso()
      )
      .run();

    return id;
  }
}
