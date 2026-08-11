import type { Env } from "../domain/runtime";
import { ManualUrlIngestionService } from "../manual-url/manual-url-ingestion-service";
import type { ManualUrlPreview } from "../manual-url/types";
import type { TelegramClient } from "./client";
import { createRepositories } from "../storage/repositories";
import { createTopicFingerprint } from "../scoring/topic-fingerprint";
import { buildCreateDraftButton } from "./drafts";

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
        [{ text: "Создать пост по материалу", callback_data: `manualurl:draft:${preview.pendingId}` }],
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
    ? `Материал добавлен: ${result.title}\nТеперь можно нажать «Создать темы».`
    : `Материал уже был в базе, дубль не создан: ${result.title}`;
}

export async function createDraftTopicFromManualUrl(env: Env, pendingId: string): Promise<{
  text: string;
  replyMarkup: ReturnType<typeof buildCreateDraftButton>;
}> {
  const result = await service.confirm(env, pendingId);
  const repos = createRepositories(env.DB);
  const item = await repos.collectedItems.getById(result.itemId);

  if (!item) {
    throw new Error("Saved manual URL item was not found.");
  }

  const title = directTopicTitle(item.title);
  const summary = item.summary ?? item.normalized_content?.slice(0, 300) ?? item.title;
  const fingerprint = await createTopicFingerprint(title, "direct_manual_url_post", [item.id]);
  const topic = await repos.topics.createIfNotExists({
    title,
    titleRu: `Пост по материалу: ${item.title}`,
    summary: `Direct post topic based on manually submitted source: ${item.title}.`,
    summaryRu: `Тема создана напрямую по вручную добавленному материалу: ${item.title}.`,
    whyItMatters: summary,
    whyItMattersRu: "Вы выбрали этот материал вручную, поэтому бот подготовит пост вокруг этой конкретной статьи, без общего подбора тем.",
    suggestedAngle: "Turn this specific source into a practitioner LinkedIn post with a clear Product/UX perspective.",
    suggestedAngleRu: "Сделать пост именно по этому материалу: не пересказ, а профессиональный вывод с Product/UX-углом.",
    targetAudience: "Product Designers, UI/UX Designers, Design Leads, Product Managers, SaaS founders",
    sourceItemIds: [item.id],
    relevanceScore: Math.max(80, item.final_score ?? item.rule_score ?? 80),
    noveltyScore: 70,
    topicFingerprint: fingerprint,
    aiReasoningSummary: "Direct manual URL post requested by the user."
  });

  await repos.topics.updateStatus(topic.id, "selected");

  return {
    text: result.inserted
      ? `Материал добавлен: ${result.title}\nСоздана выбранная тема для поста именно по этому материалу. Когда будете готовы, нажмите «Создать черновик».`
      : `Материал уже был в базе: ${result.title}\nЯ всё равно создал/нашёл выбранную тему для поста по этому материалу. Когда будете готовы, нажмите «Создать черновик».`,
    replyMarkup: buildCreateDraftButton(topic.id)
  };
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
    "Что сделать с материалом?"
  ].join("\n");
}

function directTopicTitle(sourceTitle: string): string {
  return `A Product/UX perspective on ${sourceTitle}`.slice(0, 180);
}
