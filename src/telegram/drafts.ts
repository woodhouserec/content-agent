import { DraftService, type DraftServiceResult } from "../drafts/draft-service";
import type { Env } from "../domain/runtime";
import type { DraftRecord } from "../storage/drafts";
import { createRepositories } from "../storage/repositories";
import type { TelegramClient } from "./client";
import { escapeHtml } from "./html";

export function buildCreateDraftButton(topicId: string) {
  return {
    inline_keyboard: [[{ text: "Создать черновик", callback_data: `topic:draft:${topicId}` }]]
  };
}

export function formatDraftMessage(result: DraftServiceResult): string {
  const warning = result.factualReview.hasSeriousConflict
    ? [
        "",
        "<b>Внимание:</b> factual review нашёл серьёзные риски.",
        escapeHtml(result.factualReview.summary),
        ...result.factualReview.flags.slice(0, 3).map((flag) => `- ${escapeHtml(flag)}`)
      ]
    : [];

  const sources = result.sources.slice(0, 3).map((source, index) => {
    const date = source.publishedAt ? source.publishedAt.slice(0, 10) : "no date";
    return `${index + 1}. ${escapeHtml(source.title)} (${date})`;
  });

  return [
    `<b>${escapeHtml(result.topic.title)}</b>`,
    `Draft version: ${result.draft.version}`,
    `Status: ${escapeHtml(result.draft.status)}`,
    `Length: ${result.draft.content.length} chars`,
    "",
    escapeHtml(result.draft.content),
    ...warning,
    "",
    "<b>Sources:</b>",
    sources.join("\n") || "No sources"
  ].join("\n");
}

export function buildDraftReviewKeyboard(draftId: string) {
  return {
    inline_keyboard: [
      [{ text: "Одобрить", callback_data: `draft:approve:${draftId}` }],
      [
        { text: "Переписать", callback_data: `draft:rewrite:${draftId}` },
        { text: "Сократить", callback_data: `draft:shorten:${draftId}` }
      ],
      [
        { text: "Расширить", callback_data: `draft:expand:${draftId}` },
        { text: "Сильнее opening", callback_data: `draft:opening:${draftId}` }
      ],
      [
        { text: "Более профессионально", callback_data: `draft:tone:${draftId}` },
        { text: "Своя правка", callback_data: `draft:custom:${draftId}` }
      ],
      [
        { text: "Отклонить", callback_data: `draft:reject:${draftId}` },
        { text: "Показать источники", callback_data: `draft:sources:${draftId}` }
      ]
    ]
  };
}

export async function runDraftGeneration(env: Env, telegram: TelegramClient, chatId: string, topicId: string): Promise<void> {
  const service = new DraftService(env);
  await telegram.sendMessage(chatId, "Генерация черновика запущена. Сначала создам brief, затем текст и factual review.");
  const result = await service.generateInitialDraft(topicId, chatId);
  await telegram.sendMessage(chatId, formatDraftMessage(result), {
    replyMarkup: buildDraftReviewKeyboard(result.draft.id)
  });
}

export async function runDraftRevision(env: Env, telegram: TelegramClient, chatId: string, draftId: string, revisionType: "rewrite" | "shorten" | "expand" | "opening" | "tone" | "custom", userInstruction?: string): Promise<void> {
  const service = new DraftService(env);
  await telegram.sendMessage(chatId, revisionType === "custom" ? "Принял инструкцию. Создаю новую версию." : "Создаю новую версию черновика.");
  const result = await service.reviseDraft(draftId, revisionType, chatId, userInstruction);
  await telegram.sendMessage(chatId, formatDraftMessage(result), {
    replyMarkup: buildDraftReviewKeyboard(result.draft.id)
  });
}

export async function handleCustomRevisionMessage(env: Env, telegram: TelegramClient, chatId: string, telegramUserId: string, text: string): Promise<boolean> {
  const repos = createRepositories(env.DB);
  const state = await repos.conversationStates.getActive(telegramUserId, "custom_revision");

  if (!state) {
    return false;
  }

  await repos.conversationStates.clear(telegramUserId, "custom_revision");
  await runDraftRevision(env, telegram, chatId, state.target_id, "custom", text);
  return true;
}

export async function approveDraft(env: Env, draftId: string): Promise<string> {
  const service = new DraftService(env);
  const draft = await service.approveDraft(draftId);
  return [
    "Черновик одобрен. Ниже чистый текст для ручного копирования:",
    "",
    escapeHtml(draft.content)
  ].join("\n");
}

export async function rejectDraft(env: Env, draftId: string): Promise<string> {
  const service = new DraftService(env);
  const draft = await service.rejectDraft(draftId);
  return `Черновик отклонён: version ${draft.version}`;
}

export async function requestCustomRevision(env: Env, draftId: string, telegramUserId: string, chatId: string): Promise<string> {
  const repos = createRepositories(env.DB);
  await repos.conversationStates.set({
    telegramUserId,
    telegramChatId: chatId,
    stateType: "custom_revision",
    targetType: "draft",
    targetId: draftId,
    ttlMinutes: 30
  });
  return "Напишите одним сообщением, что изменить в черновике. Например: make it less generic или focus on design responsibility.";
}

export async function formatDraftSources(env: Env, draftId: string): Promise<string> {
  const repos = createRepositories(env.DB);
  const draft = await repos.drafts.getById(draftId);
  if (!draft) {
    return "Черновик не найден.";
  }

  const topic = await repos.topics.getById(draft.topic_id);
  if (!topic) {
    return "Тема черновика не найдена.";
  }

  const ids = parseSourceIds(topic.source_item_ids_json);
  const sources = await repos.collectedItems.getByIds(ids);
  const lines = sources.slice(0, 5).map((source, index) => {
    return `${index + 1}. ${escapeHtml(source.title)}\n${escapeHtml(source.canonical_url ?? source.url)}`;
  });

  return [`Источники черновика:`, "", lines.join("\n\n") || "Источники не найдены."].join("\n");
}

export async function buildUsageMessage(env: Env): Promise<string> {
  return new DraftService(env).usageSummary();
}

function parseSourceIds(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}
