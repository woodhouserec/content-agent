import type { Env } from "../domain/runtime";
import { createRepositories } from "../storage/repositories";
import type { SourceRecord } from "../storage/sources";
import { validateRssSourceUrl } from "../sources/source-validation";
import type { TelegramClient } from "./client";
import { buildSectionMenu, menuLabels } from "./menu";
import { formatSourceLine, handleAddSource, handleSources } from "./source-commands";

interface SourceEditorPayload {
  sourceIds: string[];
  index: number;
}

export async function setSourceMenuContext(env: Env, telegramUserId: string, chatId: string, mode: "temporary" | "permanent"): Promise<void> {
  await createRepositories(env.DB).conversationStates.set({
    telegramUserId,
    telegramChatId: chatId,
    stateType: "source_menu_context",
    targetType: "source_mode",
    targetId: mode,
    ttlMinutes: 120
  });
}

export async function getSourceMenuMode(env: Env, telegramUserId: string): Promise<"temporary" | "permanent"> {
  const state = await createRepositories(env.DB).conversationStates.getActive(telegramUserId, "source_menu_context");
  return state?.target_id === "temporary" ? "temporary" : "permanent";
}

export async function promptForSourceUrl(env: Env, telegram: TelegramClient, chatId: string, telegramUserId: string): Promise<void> {
  const mode = await getSourceMenuMode(env, telegramUserId);
  await createRepositories(env.DB).conversationStates.set({
    telegramUserId,
    telegramChatId: chatId,
    stateType: "awaiting_source_url",
    targetType: "source_mode",
    targetId: mode,
    ttlMinutes: 30
  });

  await telegram.sendMessage(
    chatId,
    mode === "temporary"
      ? "Отправьте ссылку на статью одним сообщением. Команду /addurl писать не нужно."
      : "Отправьте ссылку на RSS/Atom feed одним сообщением. Команду /addsource писать не нужно.",
    { replyMarkup: buildSectionMenu(mode === "temporary" ? "temporarySources" : "permanentSources") }
  );
}

export async function handleAwaitingSourceUrl(env: Env, telegram: TelegramClient, chatId: string, telegramUserId: string, text: string): Promise<boolean> {
  const repos = createRepositories(env.DB);
  const state = await repos.conversationStates.getActive(telegramUserId, "awaiting_source_url");

  if (!state) {
    return false;
  }

  if (text.trim() === menuLabels.back || text.trim() === menuLabels.exit) {
    await repos.conversationStates.clear(telegramUserId, "awaiting_source_url");
    await telegram.sendMessage(chatId, "Добавление ссылки отменено.", {
      replyMarkup: buildSectionMenu(state.target_id === "temporary" ? "temporarySources" : "permanentSources")
    });
    return true;
  }

  await repos.conversationStates.clear(telegramUserId, "awaiting_source_url");
  if (state.target_id === "temporary") {
    const { handleAddUrl } = await import("./manual-url-commands");
    await handleAddUrl(env, telegram, chatId, telegramUserId, `/addurl ${text.trim()}`);
    return true;
  }

  await handleAddSource(env, telegram, chatId, telegramUserId, `/addsource ${text.trim()}`);
  return true;
}

export async function showSourcesForCurrentMode(env: Env, telegram: TelegramClient, chatId: string, telegramUserId: string): Promise<void> {
  const mode = await getSourceMenuMode(env, telegramUserId);

  if (mode === "temporary") {
    const items = await createRepositories(env.DB).collectedItems.listManualUrlItems(10);
    await telegram.sendMessage(chatId, formatTemporarySources(items), { replyMarkup: buildSectionMenu("sourceList") });
    return;
  }

  await handleSources(env, telegram, chatId);
  await telegram.sendMessage(chatId, "Что сделать со списком?", { replyMarkup: buildSectionMenu("sourceList") });
}

export async function startSourceEditor(env: Env, telegram: TelegramClient, chatId: string, telegramUserId: string): Promise<void> {
  const repos = createRepositories(env.DB);
  const mode = await getSourceMenuMode(env, telegramUserId);

  if (mode === "temporary") {
    await telegram.sendMessage(
      chatId,
      "Временные источники - это разовые материалы. Их список не редактируется как RSS-источники. Чтобы добавить новый временный источник, нажмите «Добавить URL источника» и отправьте ссылку.",
      { replyMarkup: buildSectionMenu("temporarySources") }
    );
    return;
  }

  const sources = await repos.sources.listAll();

  if (sources.length === 0) {
    await telegram.sendMessage(chatId, "Источников пока нет.", { replyMarkup: buildSectionMenu("sourceList") });
    return;
  }

  await saveEditorState(env, telegramUserId, chatId, { sourceIds: sources.map((source) => source.id), index: 0 });
  await sendCurrentSource(env, telegram, chatId, telegramUserId);
}

export async function handleSourceEditorMessage(env: Env, telegram: TelegramClient, chatId: string, telegramUserId: string, text: string): Promise<boolean> {
  const repos = createRepositories(env.DB);
  const editUrlState = await repos.conversationStates.getActive(telegramUserId, "source_edit_url");

  if (editUrlState) {
    await repos.conversationStates.clear(telegramUserId, "source_edit_url");
    await updateCurrentSourceUrl(env, telegram, chatId, telegramUserId, editUrlState.target_id, text);
    return true;
  }

  const deleteState = await repos.conversationStates.getActive(telegramUserId, "source_delete_confirm");
  if (deleteState) {
    if (text.trim() === menuLabels.yes) {
      await repos.sources.disable(deleteState.target_id);
      await repos.conversationStates.clear(telegramUserId, "source_delete_confirm");
      await telegram.sendMessage(chatId, "Источник отключён.");
      await moveSourceIndex(env, telegram, chatId, telegramUserId, 1);
      return true;
    }

    if (text.trim() === menuLabels.no) {
      await repos.conversationStates.clear(telegramUserId, "source_delete_confirm");
      await telegram.sendMessage(chatId, "Удаление отменено.");
      await sendCurrentSource(env, telegram, chatId, telegramUserId);
      return true;
    }
  }

  const editorState = await repos.conversationStates.getActive(telegramUserId, "source_editor");
  if (!editorState) {
    return false;
  }

  if (text.trim() === menuLabels.change) {
    const payload = parsePayload(editorState.payload_json);
    const sourceId = payload.sourceIds[payload.index];
    await repos.conversationStates.set({
      telegramUserId,
      telegramChatId: chatId,
      stateType: "source_edit_url",
      targetType: "source",
      targetId: sourceId,
      ttlMinutes: 30
    });
    await telegram.sendMessage(chatId, "Отправьте новую ссылку RSS/Atom для текущего источника.");
    return true;
  }

  if (text.trim() === menuLabels.delete) {
    const payload = parsePayload(editorState.payload_json);
    const sourceId = payload.sourceIds[payload.index];
    await repos.conversationStates.set({
      telegramUserId,
      telegramChatId: chatId,
      stateType: "source_delete_confirm",
      targetType: "source",
      targetId: sourceId,
      ttlMinutes: 10
    });
    await telegram.sendMessage(chatId, "Отключить этот источник?", {
      replyMarkup: { keyboard: [[{ text: menuLabels.yes }, { text: menuLabels.no }]], resize_keyboard: true }
    });
    return true;
  }

  if (text.trim() === menuLabels.next) {
    await moveSourceIndex(env, telegram, chatId, telegramUserId, 1);
    return true;
  }

  if (text.trim() === menuLabels.back) {
    await moveSourceIndex(env, telegram, chatId, telegramUserId, -1);
    return true;
  }

  if (text.trim() === menuLabels.startOver) {
    await updateEditorIndex(env, telegramUserId, chatId, 0);
    await sendCurrentSource(env, telegram, chatId, telegramUserId);
    return true;
  }

  if (text.trim() === menuLabels.saveList || text.trim() === menuLabels.exit) {
    await repos.conversationStates.clear(telegramUserId, "source_editor");
    await telegram.sendMessage(chatId, text.trim() === menuLabels.saveList ? "Список сохранён." : "Редактирование завершено.", {
      replyMarkup: buildSectionMenu("sourceList")
    });
    return true;
  }

  return false;
}

async function sendCurrentSource(env: Env, telegram: TelegramClient, chatId: string, telegramUserId: string): Promise<void> {
  const repos = createRepositories(env.DB);
  const state = await repos.conversationStates.getActive(telegramUserId, "source_editor");
  if (!state) {
    return;
  }

  const payload = parsePayload(state.payload_json);
  const sourceId = payload.sourceIds[payload.index];
  const source = sourceId ? await repos.sources.getById(sourceId) : null;

  if (!source) {
    await telegram.sendMessage(chatId, "Источник не найден. Завершаю редактирование.", { replyMarkup: buildSectionMenu("sourceList") });
    await repos.conversationStates.clear(telegramUserId, "source_editor");
    return;
  }

  await telegram.sendMessage(chatId, [`Источник ${payload.index + 1} из ${payload.sourceIds.length}:`, "", formatSourceLine(source)].join("\n"), {
    replyMarkup: buildSectionMenu("sourceEditor")
  });
}

async function moveSourceIndex(env: Env, telegram: TelegramClient, chatId: string, telegramUserId: string, delta: number): Promise<void> {
  const repos = createRepositories(env.DB);
  const state = await repos.conversationStates.getActive(telegramUserId, "source_editor");
  if (!state) {
    return;
  }

  const payload = parsePayload(state.payload_json);
  const nextIndex = Math.max(0, Math.min(payload.sourceIds.length - 1, payload.index + delta));

  if (delta > 0 && payload.index === payload.sourceIds.length - 1) {
    await telegram.sendMessage(chatId, "Конец списка достигнут.", {
      replyMarkup: {
        keyboard: [[{ text: menuLabels.startOver }], [{ text: menuLabels.saveList }, { text: menuLabels.exit }]],
        resize_keyboard: true
      }
    });
    return;
  }

  await saveEditorState(env, telegramUserId, chatId, { ...payload, index: nextIndex });
  await sendCurrentSource(env, telegram, chatId, telegramUserId);
}

async function updateEditorIndex(env: Env, telegramUserId: string, chatId: string, index: number): Promise<void> {
  const state = await createRepositories(env.DB).conversationStates.getActive(telegramUserId, "source_editor");
  if (!state) {
    return;
  }
  const payload = parsePayload(state.payload_json);
  await saveEditorState(env, telegramUserId, chatId, { ...payload, index });
}

async function saveEditorState(env: Env, telegramUserId: string, chatId: string, payload: SourceEditorPayload): Promise<void> {
  await createRepositories(env.DB).conversationStates.set({
    telegramUserId,
    telegramChatId: chatId,
    stateType: "source_editor",
    targetType: "sources",
    targetId: "list",
    payload,
    ttlMinutes: 120
  });
}

async function updateCurrentSourceUrl(env: Env, telegram: TelegramClient, chatId: string, telegramUserId: string, sourceId: string, url: string): Promise<void> {
  const repos = createRepositories(env.DB);
  const validation = await validateRssSourceUrl(url.trim());

  if (!validation.ok) {
    await telegram.sendMessage(chatId, `Ссылка не сохранена: ${validation.errorMessage ?? "RSS/Atom не найден"}`);
    await sendCurrentSource(env, telegram, chatId, telegramUserId);
    return;
  }

  const source = await repos.sources.getById(sourceId);
  const config = readConfig(source);
  await repos.sources.updateUrl({
    id: sourceId,
    name: validation.feedTitle ?? source?.name ?? new URL(validation.normalizedUrl).hostname,
    url: validation.normalizedUrl,
    config: {
      ...config,
      author_name: validation.feedTitle ?? config.author_name ?? new URL(validation.normalizedUrl).hostname,
      source_tier: config.source_tier ?? "discovery",
      content_kind: config.content_kind ?? "news",
      language: config.language ?? "en",
      topic_tags: config.topic_tags ?? [],
      trust_score: config.trust_score ?? 60,
      editorial_priority: config.editorial_priority ?? 2,
      max_content_age_days: config.max_content_age_days ?? 14,
      allow_full_text: config.allow_full_text ?? false,
      license_notes: config.license_notes ?? "Updated via Telegram after RSS/Atom validation.",
      max_items_per_run: config.max_items_per_run ?? 5
    },
    enabled: true
  });

  await telegram.sendMessage(chatId, "Ссылка источника обновлена.");
  await sendCurrentSource(env, telegram, chatId, telegramUserId);
}

function parsePayload(value: string | null): SourceEditorPayload {
  if (!value) {
    return { sourceIds: [], index: 0 };
  }

  try {
    const parsed = JSON.parse(value) as Partial<SourceEditorPayload>;
    return {
      sourceIds: Array.isArray(parsed.sourceIds) ? parsed.sourceIds.filter((id): id is string => typeof id === "string") : [],
      index: typeof parsed.index === "number" ? parsed.index : 0
    };
  } catch {
    return { sourceIds: [], index: 0 };
  }
}

function readConfig(source: SourceRecord | null): Record<string, unknown> {
  if (!source?.config_json) {
    return {};
  }

  try {
    return JSON.parse(source.config_json) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function formatTemporarySources(items: Array<{ title: string; canonical_url: string | null; url: string; published_at: string | null; collected_at: string; extraction_status?: string | null; metadata_json: string | null }>): string {
  if (items.length === 0) {
    return "Временных источников пока нет. Нажмите «Добавить URL источника» и отправьте ссылку на статью.";
  }

  const lines = items.map((item, index) => {
    const metadata = readMetadata(item.metadata_json);
    const status = typeof metadata.extraction_status === "string" ? metadata.extraction_status : "saved";
    const date = item.published_at?.slice(0, 10) ?? item.collected_at.slice(0, 10);
    return [
      `${index + 1}. ${item.title}`,
      `Status: ${status}`,
      `Date: ${date}`,
      item.canonical_url ?? item.url
    ].join("\n");
  });

  return ["Временные источники:", "", lines.join("\n\n")].join("\n");
}

function readMetadata(value: string | null): Record<string, unknown> {
  if (!value) {
    return {};
  }

  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}
