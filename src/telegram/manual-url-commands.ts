import type { Env } from "../domain/runtime";
import { ManualUrlIngestionService } from "../manual-url/manual-url-ingestion-service";
import type { ManualUrlPreview } from "../manual-url/types";
import type { TelegramClient } from "./client";
import { createRepositories } from "../storage/repositories";

const service = new ManualUrlIngestionService();

export async function handleAddUrl(env: Env, telegram: TelegramClient, chatId: string, telegramUserId: string, text: string | undefined): Promise<void> {
  const url = extractUrl(text ?? "");

  if (!url) {
    await telegram.sendMessage(chatId, "Используйте: /addurl https://example.com/article");
    return;
  }

  const preview = await service.preview(env, url, telegramUserId);

  await telegram.sendMessage(chatId, formatManualUrlPreview(preview), {
    replyMarkup: {
      inline_keyboard: [
        [{ text: "Добавить материал", callback_data: `manualurl:add:${preview.pendingId}` }],
        [
          { text: "Отклонить", callback_data: `manualurl:reject:${preview.pendingId}` },
          { text: "Открыть оригинал", url: preview.article.finalUrl }
        ]
      ]
    }
  });
}

export async function confirmManualUrl(env: Env, pendingId: string): Promise<string> {
  const result = await service.confirm(env, pendingId);
  return result.inserted
    ? `Материал добавлен: ${result.title}\nТеперь можно запустить /score.`
    : `Материал уже был в базе, дубль не создан: ${result.title}`;
}

export async function rejectManualUrl(env: Env, pendingId: string): Promise<string> {
  await createRepositories(env.DB).pendingManualUrls.updateStatus(pendingId, "rejected");
  return "Материал отклонён. В collected_items ничего не сохранено.";
}

export function extractUrl(text: string): string | null {
  const match = /(https?:\/\/[^\s]+)/i.exec(text);
  return match?.[1] ?? null;
}

function formatManualUrlPreview(preview: ManualUrlPreview & { pendingId: string }): string {
  const article = preview.article;
  const warnings = article.extractionWarnings.length > 0
    ? article.extractionWarnings.map((warning) => `- ${warning}`).join("\n")
    : "Нет";

  return [
    "Предпросмотр материала:",
    "",
    `Title: ${article.title ?? "не найден"}`,
    `Site: ${article.siteName ?? "не найден"}`,
    `Author: ${article.author ?? "не найден"}`,
    `Published: ${article.publishedAt ? article.publishedAt.slice(0, 10) : "не найдено"}`,
    `Status: ${article.extractionStatus}`,
    `Text length: ${article.text?.length ?? 0}`,
    preview.duplicateItemId ? `Дубль: найден existing item ${preview.duplicateItemId}` : "Дубль: не найден",
    "",
    `Description: ${article.description ?? "не найдено"}`,
    "",
    "Warnings:",
    warnings,
    "",
    "Добавить материал?"
  ].join("\n");
}
