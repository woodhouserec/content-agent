import type { Env } from "../domain/runtime";
import { createRepositories } from "../storage/repositories";
import { nowIso } from "../utils/time";
import type { TelegramCallbackQuery } from "./types";
import { formatTopicSources, formatTopicWhy, getTopicSources } from "./topics";
import { confirmPendingSource } from "./source-commands";

export async function handleCallback(env: Env, callback: TelegramCallbackQuery): Promise<string> {
  const repos = createRepositories(env.DB);
  const chatId = callback.message?.chat.id ? String(callback.message.chat.id) : String(callback.from.id);
  const data = callback.data ?? "unknown";
  const [targetType, action, targetId] = data.split(":");

  await repos.telegramActions.create({
    telegramUserId: String(callback.from.id),
    telegramChatId: chatId,
    messageId: callback.message?.message_id ? String(callback.message.message_id) : undefined,
    callbackQueryId: callback.id,
    action: action ?? data,
    targetType: targetType ?? "unknown",
    targetId: targetId ?? "unknown",
    payload: { data },
    handledAt: nowIso()
  });

  if (targetType === "topic" && targetId) {
    const topic = await repos.topics.getById(targetId);

    if (!topic) {
      return "Тема не найдена.";
    }

    if (action === "select") {
      await repos.topics.updateStatus(targetId, "selected");
      return "Тема выбрана. Генерация поста пока не запускается.";
    }

    if (action === "skip") {
      await repos.topics.updateStatus(targetId, "skipped");
      return "Тема пропущена.";
    }

    if (action === "sources") {
      return formatTopicSources(topic, await getTopicSources(env, topic));
    }

    if (action === "why") {
      return formatTopicWhy(topic);
    }
  }

  if (targetType === "addsource" && action === "confirm" && targetId) {
    return confirmPendingSource(env, targetId);
  }

  return "Действие распознано, но пока не поддерживается.";
}
