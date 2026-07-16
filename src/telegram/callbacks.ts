import type { Env } from "../domain/runtime";
import { createRepositories } from "../storage/repositories";
import { nowIso } from "../utils/time";
import type { TelegramCallbackQuery } from "./types";

export async function handleCallback(env: Env, callback: TelegramCallbackQuery): Promise<string> {
  const repos = createRepositories(env.DB);
  const chatId = callback.message?.chat.id ? String(callback.message.chat.id) : String(callback.from.id);
  const data = callback.data ?? "unknown";

  await repos.telegramActions.create({
    telegramUserId: String(callback.from.id),
    telegramChatId: chatId,
    messageId: callback.message?.message_id ? String(callback.message.message_id) : undefined,
    callbackQueryId: callback.id,
    action: data,
    targetType: "unknown",
    targetId: "unknown",
    payload: { data },
    handledAt: nowIso()
  });

  return "Эта кнопка уже распознана, но бизнес-логика появится на следующем этапе.";
}
