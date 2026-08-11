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

  const title = item.title;
  const titleRu = `Пост по материалу: ${item.title}`.slice(0, 220);
  const summary = item.summary ?? item.normalized_content?.slice(0, 500) ?? item.raw_content?.slice(0, 500) ?? item.title;
  const whyItMatters = [
    "The user manually selected this source for a dedicated LinkedIn post.",
    "Treat the topic record as routing metadata; the draft brief must perform the full editorial analysis from the source context."
  ].join(" ");
  const whyItMattersRu = [
    "Материал выбран вручную для отдельного поста.",
    "Полноценный смысловой анализ должен выполняться на этапе draft brief по тексту статьи, цитатам и ссылкам."
  ].join(" ");
  const suggestedAngle = "Create a grounded practitioner LinkedIn post directly from this manually submitted source.";
  const suggestedAngleRu = "Создать grounded LinkedIn-пост напрямую по этому материалу, без отдельной генерации темы.";
  const reasoningSummary = [
    "Manual URL direct post request.",
    "Do not use this technical topic as the final editorial angle.",
    "Build the draft brief directly from the source title, description, extracted text, important quotes, context links, writing profile, and preference memory."
  ].join(" ");
  const fingerprint = await createTopicFingerprint(`manual-url-direct:${item.id}`, suggestedAngle, [item.id]);
  const topic = await repos.topics.createIfNotExists({
    title,
    titleRu,
    summary,
    summaryRu: summary,
    whyItMatters,
    whyItMattersRu,
    suggestedAngle,
    suggestedAngleRu,
    targetAudience: "Product Designers, UX Researchers, UI/UX Designers, Design Leads, Product Managers, SaaS founders",
    sourceItemIds: [item.id],
    relevanceScore: Math.max(80, item.final_score ?? item.rule_score ?? 80),
    noveltyScore: 70,
    topicFingerprint: fingerprint,
    aiReasoningSummary: reasoningSummary
  });

  await repos.topics.updateStatus(topic.id, "selected");

  return {
    text: [
      result.inserted ? `Материал добавлен: ${result.title}` : `Материал уже был в базе: ${result.title}`,
      "Материал подготовлен для черновика.",
      "Полноценный AI-анализ статьи начнётся на этапе draft brief.",
      "",
      `Материал: ${item.title}`,
      "",
      "Когда будете готовы, нажмите «Создать черновик»."
    ].join("\n"),
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
