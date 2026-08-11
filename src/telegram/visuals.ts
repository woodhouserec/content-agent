import type { Env } from "../domain/runtime";
import { VisualService, type VisualGenerationResult } from "../visual/visual-service";
import type { TelegramClient } from "./client";
import { escapeHtml } from "./html";

export function buildVisualButton(draftId: string) {
  return {
    inline_keyboard: [[{ text: "Создать иллюстрацию", callback_data: `draft:visual:${draftId}` }]]
  };
}

export function buildVisualReviewKeyboard(assetId: string, draftId: string) {
  return {
    inline_keyboard: [
      [{ text: "Одобрить изображение", callback_data: `visual:approve:${assetId}` }],
      [
        { text: "Другой вариант", callback_data: `draft:visual:${draftId}` },
        { text: "Отклонить изображение", callback_data: `visual:reject:${assetId}` }
      ]
    ]
  };
}

export async function runVisualGeneration(env: Env, telegram: TelegramClient, chatId: string, draftId: string): Promise<void> {
  const service = new VisualService(env);
  await telegram.sendMessage(chatId, "Генерация иллюстрации запущена. Сначала создам visual brief, затем изображение.");
  const result = await service.generateForDraft(draftId);
  await sendVisualReview(telegram, chatId, result);
}

export async function approveVisualAsset(env: Env, assetId: string): Promise<string> {
  const asset = await new VisualService(env).approveAsset(assetId);
  return `Изображение одобрено: version ${asset.version}`;
}

export async function rejectVisualAsset(env: Env, assetId: string): Promise<string> {
  const asset = await new VisualService(env).rejectAsset(assetId);
  return `Изображение отклонено: version ${asset.version}`;
}

async function sendVisualReview(telegram: TelegramClient, chatId: string, result: VisualGenerationResult): Promise<void> {
  await telegram.sendPhoto(chatId, {
    bytes: result.imageBytes,
    mimeType: result.mimeType,
    filename: `visual-${result.asset.id}.png`,
    caption: [
      `<b>${escapeHtml(result.topic.title_ru ?? result.topic.title)}</b>`,
      "",
      `<b>Concept:</b> ${escapeHtml(result.brief.concept)}`,
      result.brief.metaphor ? `<b>Metaphor:</b> ${escapeHtml(result.brief.metaphor)}` : null,
      `<b>Version:</b> ${result.asset.version}`
    ].filter(Boolean).join("\n"),
    replyMarkup: buildVisualReviewKeyboard(result.asset.id, result.draft.id)
  });
}
