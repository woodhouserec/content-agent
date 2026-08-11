import { DraftService, type DraftServiceResult } from "../drafts/draft-service";
import type { Env } from "../domain/runtime";
import type { DraftRecord } from "../storage/drafts";
import { createRepositories } from "../storage/repositories";
import { createLinkedInConnectUrl } from "../linkedin/service";
import type { TelegramClient } from "./client";
import { escapeHtml } from "./html";

const telegramSafeMessageLength = 2800;

export function buildCreateDraftButton(topicId: string) {
  return {
    inline_keyboard: [[{ text: "Создать черновик", callback_data: `topic:draft:${topicId}` }]]
  };
}

export function formatDraftMessage(result: DraftServiceResult): string {
  const russianTranslation = extractRussianTranslation(result.draft.generation_metadata_json);
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
    ...(russianTranslation ? ["<b>Русский перевод для проверки:</b>", escapeHtml(russianTranslation), ""] : []),
    "<b>English LinkedIn post:</b>",
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
  await sendDraftReviewMessages(telegram, chatId, result);
}

export async function runDraftRevision(env: Env, telegram: TelegramClient, chatId: string, draftId: string, revisionType: "rewrite" | "shorten" | "expand" | "opening" | "tone" | "custom", userInstruction?: string): Promise<void> {
  const service = new DraftService(env);
  await telegram.sendMessage(chatId, revisionType === "custom" ? "Принял инструкцию. Создаю новую версию." : "Создаю новую версию черновика.");
  const result = await service.reviseDraft(draftId, revisionType, chatId, userInstruction);
  await sendDraftReviewMessages(telegram, chatId, result);
}

export async function handleCustomRevisionMessage(env: Env, telegram: TelegramClient, chatId: string, telegramUserId: string, text: string): Promise<boolean> {
  const instruction = await consumeCustomRevisionInstruction(env, telegramUserId, text);
  if (!instruction) {
    return false;
  }

  await runDraftRevision(env, telegram, chatId, instruction.draftId, "custom", instruction.text);
  return true;
}

export async function consumeCustomRevisionInstruction(env: Env, telegramUserId: string, text: string): Promise<{ draftId: string; text: string } | null> {
  const repos = createRepositories(env.DB);
  const state = await repos.conversationStates.getActive(telegramUserId, "custom_revision");

  if (!state) {
    return null;
  }

  await repos.conversationStates.clear(telegramUserId, "custom_revision");
  return {
    draftId: state.target_id,
    text
  };
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

export async function sendApprovedDraftMessages(
  env: Env,
  telegram: TelegramClient,
  chatId: string,
  draftId: string,
  telegramUserId: string
): Promise<void> {
  const service = new DraftService(env);
  const draft = await service.approveDraft(draftId);

  await telegram.sendMessage(chatId, "Черновик одобрен. Ниже чистый английский текст для ручного копирования.", {
    replyMarkup: await buildApprovedDraftKeyboard(env, draft.id, telegramUserId, chatId)
  });
  await sendLongSection(telegram, chatId, "English LinkedIn post", draft.content);
  await telegram.sendMessage(chatId, await formatDraftSources(env, draft.id));
}

export async function buildApprovedDraftKeyboard(env: Env, draftId: string, telegramUserId: string, chatId: string) {
  const connectUrl = await tryCreateLinkedInConnectUrl(env, { telegramUserId, telegramChatId: chatId });
  const linkedinRow = connectUrl
    ? [{ text: "Подключить LinkedIn", url: connectUrl }]
    : [{ text: "Подключить LinkedIn", callback_data: `draft:linkedin:${draftId}` }];

  return {
    inline_keyboard: [
      [{ text: "Опубликовать в LinkedIn", callback_data: `draft:publish:${draftId}` }],
      [{ text: "Создать иллюстрацию", callback_data: `draft:visual:${draftId}` }],
      linkedinRow,
      [{ text: "Показать источники", callback_data: `draft:sources:${draftId}` }]
    ]
  };
}

export async function buildLinkedInConnectMessage(env: Env, telegramUserId: string, chatId: string): Promise<string> {
  const connectUrl = await createLinkedInConnectUrl(env, { telegramUserId, telegramChatId: chatId });

  return [
    "Откройте эту ссылку, чтобы подключить LinkedIn:",
    "",
    escapeHtml(connectUrl)
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

async function sendDraftReviewMessages(telegram: TelegramClient, chatId: string, result: DraftServiceResult): Promise<void> {
  const russianTranslation = extractRussianTranslation(result.draft.generation_metadata_json);

  await telegram.sendMessage(chatId, [
    `<b>${escapeHtml(result.topic.title_ru ?? result.topic.title)}</b>`,
    `Draft version: ${result.draft.version}`,
    `Status: ${escapeHtml(result.draft.status)}`,
    `English length: ${result.draft.content.length} chars`
  ].join("\n"));

  if (russianTranslation) {
    await sendLongSection(telegram, chatId, "Русский перевод для проверки", russianTranslation);
  }

  await sendLongSection(telegram, chatId, "English LinkedIn post", result.draft.content);
  await telegram.sendMessage(chatId, formatDraftReviewFooter(result), {
    replyMarkup: buildDraftReviewKeyboard(result.draft.id)
  });
}

async function sendLongSection(telegram: TelegramClient, chatId: string, title: string, text: string): Promise<void> {
  const chunks = chunkText(text, telegramSafeMessageLength);

  for (let index = 0; index < chunks.length; index += 1) {
    const suffix = chunks.length > 1 ? ` ${index + 1}/${chunks.length}` : "";
    await telegram.sendMessage(chatId, [`<b>${escapeHtml(title)}${suffix}:</b>`, escapeHtml(chunks[index])].join("\n"));
  }
}

function formatDraftReviewFooter(result: DraftServiceResult): string {
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
    "Черновик готов. Используйте кнопки ниже для правок или одобрения.",
    ...warning,
    "",
    "<b>Sources:</b>",
    sources.join("\n") || "No sources"
  ].join("\n");
}

function chunkText(text: string, maxLength: number): string[] {
  const chunks: string[] = [];
  let remaining = text.trim();

  while (remaining.length > maxLength) {
    const slice = remaining.slice(0, maxLength);
    const breakpoint = Math.max(slice.lastIndexOf("\n\n"), slice.lastIndexOf("\n"), slice.lastIndexOf(". "), slice.lastIndexOf(" "));
    const end = breakpoint > maxLength * 0.6 ? breakpoint + 1 : maxLength;
    chunks.push(remaining.slice(0, end).trim());
    remaining = remaining.slice(end).trim();
  }

  if (remaining.length > 0) {
    chunks.push(remaining);
  }

  return chunks.length > 0 ? chunks : [""];
}

function extractRussianTranslation(metadataJson: string | null): string | null {
  if (!metadataJson) {
    return null;
  }

  try {
    const metadata = JSON.parse(metadataJson) as { russian_translation?: unknown };
    return typeof metadata.russian_translation === "string" && metadata.russian_translation.trim().length > 0
      ? metadata.russian_translation.trim()
      : null;
  } catch {
    return null;
  }
}

async function tryCreateLinkedInConnectUrl(
  env: Env,
  input: { telegramUserId: string; telegramChatId: string }
): Promise<string | null> {
  try {
    return await createLinkedInConnectUrl(env, input);
  } catch {
    return null;
  }
}
