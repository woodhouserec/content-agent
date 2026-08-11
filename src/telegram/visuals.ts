import type { Env } from "../domain/runtime";
import { createRepositories } from "../storage/repositories";
import type { TopicRecord } from "../storage/topics";
import type { VisualAssetRecord, VisualBriefRecord } from "../storage/visuals";
import { R2AssetStorage } from "../visual/r2-storage";
import { VisualService, type VisualGenerationResult } from "../visual/visual-service";
import type { TelegramClient } from "./client";
import { escapeHtml } from "./html";

export function buildVisualButton(draftId: string) {
  return {
    inline_keyboard: [[{ text: "Создать иллюстрацию", callback_data: `draft:visual:${draftId}` }]]
  };
}

export function buildVisualReviewKeyboard(assetId: string, draftId: string, version: number, totalVersions: number) {
  const navigationRow = totalVersions > 1
    ? [
        { text: "<", callback_data: `visual:prev:${assetId}` },
        { text: `${version}/${totalVersions}`, callback_data: `visual:noop:${assetId}` },
        { text: ">", callback_data: `visual:next:${assetId}` }
      ]
    : [{ text: `${version}/${totalVersions}`, callback_data: `visual:noop:${assetId}` }];

  return {
    inline_keyboard: [
      navigationRow,
      [{ text: "Одобрить изображение", callback_data: `visual:approve:${assetId}` }],
      [
        { text: "Другой вариант", callback_data: `draft:visual:${draftId}` },
        { text: "Отклонить изображение", callback_data: `visual:reject:${assetId}` }
      ],
      [{ text: "Своя правка", callback_data: `visual:custom:${assetId}` }]
    ]
  };
}

export async function runVisualGeneration(env: Env, telegram: TelegramClient, chatId: string, telegramUserId: string, draftId: string): Promise<void> {
  const service = new VisualService(env);
  await telegram.sendMessage(chatId, "Генерация иллюстрации запущена. Сначала создам visual brief, затем изображение.");
  const result = await service.generateForDraft(draftId);
  await setVisualReviewDraft(env, telegramUserId, chatId, draftId);
  await sendGeneratedVisualReview(env, telegram, chatId, result, draftId);
}

export async function runCustomVisualRevision(env: Env, telegram: TelegramClient, chatId: string, telegramUserId: string, assetId: string, instruction: string): Promise<void> {
  await telegram.sendMessage(chatId, "Принял инструкцию. Создаю новый вариант изображения.");
  const result = await new VisualService(env).generateCustomVariant(assetId, instruction);
  const draftId = await getVisualReviewDraftId(env, telegramUserId) ?? result.draft.id;
  await setVisualReviewDraft(env, telegramUserId, chatId, draftId);
  await sendGeneratedVisualReview(env, telegram, chatId, result, draftId);
}

export async function approveVisualAsset(env: Env, telegramUserId: string, assetId: string): Promise<{ message: string; draftId: string }> {
  const asset = await new VisualService(env).approveAsset(assetId);
  const repos = createRepositories(env.DB);
  const brief = await repos.visuals.getBriefById(asset.visual_brief_id);
  if (!brief) {
    throw new Error("Visual brief not found");
  }

  return {
    message: `Изображение одобрено: version ${asset.version}. Теперь пост можно опубликовать в LinkedIn.`,
    draftId: await getVisualReviewDraftId(env, telegramUserId) ?? brief.draft_id
  };
}

export async function rejectVisualAsset(env: Env, assetId: string): Promise<string> {
  const asset = await new VisualService(env).rejectAsset(assetId);
  return `Изображение отклонено: version ${asset.version}`;
}

export async function requestCustomVisualRevision(env: Env, telegramUserId: string, chatId: string, assetId: string): Promise<string> {
  await createRepositories(env.DB).conversationStates.set({
    telegramUserId,
    telegramChatId: chatId,
    stateType: "custom_visual_revision",
    targetType: "visual_asset",
    targetId: assetId,
    ttlMinutes: 30
  });
  return "Напишите одним сообщением, что изменить в изображении. Например: меньше робота, больше продуктового контекста, чище композиция.";
}

export async function consumeCustomVisualInstruction(env: Env, telegramUserId: string, text: string): Promise<{ assetId: string; text: string } | null> {
  const repos = createRepositories(env.DB);
  const state = await repos.conversationStates.getActive(telegramUserId, "custom_visual_revision");
  if (!state) {
    return null;
  }

  await repos.conversationStates.clear(telegramUserId, "custom_visual_revision");
  return {
    assetId: state.target_id,
    text
  };
}

export async function sendAdjacentVisualAsset(env: Env, telegram: TelegramClient, chatId: string, telegramUserId: string, assetId: string, direction: "prev" | "next"): Promise<void> {
  const repos = createRepositories(env.DB);
  const current = await repos.visuals.getAssetById(assetId);
  if (!current) {
    throw new Error("Visual asset not found");
  }

  const brief = await requireVisualBrief(env, current.visual_brief_id);
  const assets = await repos.visuals.getAssetsForTopic(brief.topic_id);
  const currentIndex = Math.max(0, assets.findIndex((asset) => asset.id === current.id));
  const nextIndex = direction === "next"
    ? Math.min(assets.length - 1, currentIndex + 1)
    : Math.max(0, currentIndex - 1);

  await sendStoredVisualReview(env, telegram, chatId, telegramUserId, assets[nextIndex]?.id ?? current.id);
}

export async function sendStoredVisualReview(env: Env, telegram: TelegramClient, chatId: string, telegramUserId: string, assetId: string): Promise<void> {
  const repos = createRepositories(env.DB);
  const asset = await repos.visuals.getAssetById(assetId);
  if (!asset) {
    throw new Error("Visual asset not found");
  }

  const brief = await requireVisualBrief(env, asset.visual_brief_id);
  const topic = await repos.topics.getById(brief.topic_id);
  if (!topic) {
    throw new Error("Topic not found");
  }

  const stored = await new R2AssetStorage(env).get(asset.storage_key);
  const assets = await repos.visuals.getAssetsForTopic(brief.topic_id);
  const draftId = await getVisualReviewDraftId(env, telegramUserId) ?? brief.draft_id;
  const displayIndex = Math.max(1, assets.findIndex((candidate) => candidate.id === asset.id) + 1);
  await sendVisualReviewPhoto(telegram, chatId, {
    asset,
    brief,
    topic,
    draftId,
    totalVersions: assets.length,
    displayIndex,
    imageBytes: stored.bytes,
    mimeType: stored.mimeType
  });
}

async function sendGeneratedVisualReview(env: Env, telegram: TelegramClient, chatId: string, result: VisualGenerationResult, draftId: string): Promise<void> {
  const assets = await createRepositories(env.DB).visuals.getAssetsForTopic(result.topic.id);
  const displayIndex = Math.max(1, assets.findIndex((candidate) => candidate.id === result.asset.id) + 1);
  await sendVisualReviewPhoto(telegram, chatId, {
    asset: result.asset,
    brief: result.brief,
    topic: result.topic,
    draftId,
    totalVersions: assets.length,
    displayIndex,
    imageBytes: result.imageBytes,
    mimeType: result.mimeType
  });
}

async function setVisualReviewDraft(env: Env, telegramUserId: string, chatId: string, draftId: string): Promise<void> {
  await createRepositories(env.DB).conversationStates.set({
    telegramUserId,
    telegramChatId: chatId,
    stateType: "visual_review_draft",
    targetType: "draft",
    targetId: draftId,
    ttlMinutes: 120
  });
}

async function getVisualReviewDraftId(env: Env, telegramUserId: string): Promise<string | null> {
  const state = await createRepositories(env.DB).conversationStates.getActive(telegramUserId, "visual_review_draft");
  return state?.target_id ?? null;
}

async function sendVisualReviewPhoto(
  telegram: TelegramClient,
  chatId: string,
  input: {
    asset: VisualAssetRecord;
    brief: VisualBriefRecord;
    topic: TopicRecord;
    draftId: string;
    totalVersions: number;
    displayIndex: number;
    imageBytes: ArrayBuffer;
    mimeType: string;
  }
): Promise<void> {
  await telegram.sendPhoto(chatId, {
    bytes: input.imageBytes,
    mimeType: input.mimeType,
    filename: `visual-${input.asset.id}.png`,
    caption: [
      `<b>${escapeHtml(input.topic.title_ru ?? input.topic.title)}</b>`,
      "",
      `<b>Concept:</b> ${escapeHtml(input.brief.concept)}`,
      input.brief.metaphor ? `<b>Metaphor:</b> ${escapeHtml(input.brief.metaphor)}` : null,
      `<b>Status:</b> ${escapeHtml(input.asset.status)}`,
      `<b>Version:</b> ${input.asset.version}`
    ].filter(Boolean).join("\n"),
    replyMarkup: buildVisualReviewKeyboard(input.asset.id, input.draftId, input.displayIndex, Math.max(1, input.totalVersions))
  });
}

async function requireVisualBrief(env: Env, visualBriefId: string): Promise<VisualBriefRecord> {
  const brief = await createRepositories(env.DB).visuals.getBriefById(visualBriefId);
  if (!brief) {
    throw new Error("Visual brief not found");
  }
  return brief;
}
