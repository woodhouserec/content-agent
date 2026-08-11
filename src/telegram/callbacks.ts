import type { Env } from "../domain/runtime";
import { rememberPreference } from "../preferences/memory";
import { createRepositories } from "../storage/repositories";
import { nowIso } from "../utils/time";
import type { TelegramCallbackQuery } from "./types";
import { formatTopicEnglish, formatTopicSources, formatTopicWhy, getTopicSources } from "./topics";
import { confirmPendingSource } from "./source-commands";
import { confirmManualUrl, createDraftTopicFromManualUrl, rejectManualUrl } from "./manual-url-commands";
import { buildCreateDraftButton } from "./drafts";

export interface CallbackResponse {
  text: string;
  replyMarkup?: {
    inline_keyboard: Array<Array<{ text: string; callback_data?: string; url?: string }>>;
  };
}

export async function handleCallback(env: Env, callback: TelegramCallbackQuery): Promise<CallbackResponse> {
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
      return { text: "Тема не найдена." };
    }

    if (action === "select") {
      await repos.topics.updateStatus(targetId, "selected");
      await safeRememberTopic(env, "topic_selected", targetId, "topic_preferences", `Selected topic direction: ${topic.title_ru ?? topic.title}`);
      return {
        text: "Тема выбрана. Генерация поста не запускается автоматически. Когда будете готовы, нажмите «Создать черновик».",
        replyMarkup: buildCreateDraftButton(targetId)
      };
    }

    if (action === "skip") {
      await repos.topics.updateStatus(targetId, "skipped");
      await safeRememberTopic(env, "topic_skipped", targetId, "avoid", `Avoid or de-prioritize topic direction: ${topic.title_ru ?? topic.title}`);
      return { text: "Тема пропущена." };
    }

    if (action === "sources") {
      return { text: formatTopicSources(topic, await getTopicSources(env, topic)) };
    }

    if (action === "why") {
      return { text: formatTopicWhy(topic) };
    }

    if (action === "english") {
      return { text: formatTopicEnglish(topic, await getTopicSources(env, topic)) };
    }
  }

  if (targetType === "addsource" && action === "confirm" && targetId) {
    return { text: await confirmPendingSource(env, targetId) };
  }

  if (targetType === "manualurl" && targetId) {
    if (action === "draft") {
      return createDraftTopicFromManualUrl(env, targetId);
    }

    if (action === "add") {
      return { text: await confirmManualUrl(env, targetId) };
    }

    if (action === "reject") {
      return { text: await rejectManualUrl(env, targetId) };
    }
  }

  return { text: "Действие распознано, но пока не поддерживается." };
}

async function safeRememberTopic(
  env: Env,
  eventType: string,
  topicId: string,
  section: "topic_preferences" | "avoid",
  signal: string
): Promise<void> {
  try {
    await rememberPreference(env, {
      eventType,
      targetType: "topic",
      targetId: topicId,
      section,
      signal
    });
  } catch {
    // Preference memory should never block Telegram callbacks.
  }
}
