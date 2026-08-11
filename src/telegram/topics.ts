import type { Env } from "../domain/runtime";
import { runScoring } from "../scoring/scoring-runner";
import type { CollectedItemMode } from "../storage/collected-items";
import { createRepositories } from "../storage/repositories";
import type { TopicRecord } from "../storage/topics";
import type { TelegramClient } from "./client";

export async function runScoringAndSendTopics(env: Env, telegram: TelegramClient, chatId: string, mode?: CollectedItemMode): Promise<void> {
  const result = await runScoring(env, { mode });
  const lines = [
    `Генерация тезисов завершена${mode ? ` (${mode === "temporary" ? "временные источники" : "постоянные источники"})` : ""}.`,
    `Материалов оценено: ${result.scoredItems}`,
    `Материалов использовано для тезисов: ${result.topicCandidateItems}`,
    `OpenAI-запросов: ${result.aiRequests}`,
    `AI fallback: ${result.usedAiFallback ? "да" : "нет"}`,
    `Новых тезисов: ${result.topicsCreated}`,
    `Дубликатов тезисов: ${result.topicsSkippedAsDuplicates}`,
    `Возвращено в доступные: ${result.topicsRestored}`
  ];
  const sourceIssues = await formatLatestSourceIssues(env);
  if (sourceIssues) {
    lines.push("", sourceIssues);
  }
  await telegram.sendMessage(chatId, lines.join("\n"));

  if (result.topicIds.length > 0) {
    await sendTopicsByIds(env, telegram, chatId, result.topicIds);
    return;
  }

  await sendLatestTopics(env, telegram, chatId, mode);
}

export async function sendLatestTopics(env: Env, telegram: TelegramClient, chatId: string, mode?: CollectedItemMode): Promise<void> {
  const repos = createRepositories(env.DB);
  const allTopics = await repos.topics.listAvailable(mode ? 100 : 10);
  const topics = mode ? await filterTopicsByMode(env, allTopics, mode, 5) : allTopics.slice(0, 5);

  if (topics.length === 0) {
    await telegram.sendMessage(chatId, "Пока нет доступных тезисов. Сначала нажмите «Сгенерировать тезисы» после сбора материалов.");
    return;
  }

  for (const topic of topics) {
    const sources = await getTopicSources(env, topic);
    await telegram.sendMessage(chatId, formatTopicMessage(topic, sources), {
      replyMarkup: {
        inline_keyboard: [
          [{ text: "Создать черновик", callback_data: `topic:draft:${topic.id}` }],
          [
            { text: "Пропустить", callback_data: `topic:skip:${topic.id}` },
            { text: "Показать источники", callback_data: `topic:sources:${topic.id}` }
          ],
          [
            { text: "Почему выбрано", callback_data: `topic:why:${topic.id}` },
            { text: "English", callback_data: `topic:english:${topic.id}` }
          ]
        ]
      }
    });
    await repos.topics.markSent(topic.id);
  }
}

async function sendTopicsByIds(env: Env, telegram: TelegramClient, chatId: string, topicIds: string[]): Promise<void> {
  const repos = createRepositories(env.DB);
  const uniqueIds = [...new Set(topicIds)].slice(0, 5);
  const topics = (await Promise.all(uniqueIds.map((id) => repos.topics.getById(id))))
    .filter((topic): topic is TopicRecord => topic !== null)
    .filter((topic) => topic.status !== "selected" && topic.status !== "skipped" && topic.status !== "archived");

  if (topics.length === 0) {
    await telegram.sendMessage(chatId, "Пока нет доступных тезисов. Сначала нажмите «Сгенерировать тезисы» после сбора материалов.");
    return;
  }

  for (const topic of topics) {
    const sources = await getTopicSources(env, topic);
    await telegram.sendMessage(chatId, formatTopicMessage(topic, sources), {
      replyMarkup: {
        inline_keyboard: [
          [{ text: "Создать черновик", callback_data: `topic:draft:${topic.id}` }],
          [
            { text: "Пропустить", callback_data: `topic:skip:${topic.id}` },
            { text: "Показать источники", callback_data: `topic:sources:${topic.id}` }
          ],
          [
            { text: "Почему выбрано", callback_data: `topic:why:${topic.id}` },
            { text: "English", callback_data: `topic:english:${topic.id}` }
          ]
        ]
      }
    });
    await repos.topics.markSent(topic.id);
  }
}

export async function resetTopicsForMode(env: Env, mode: CollectedItemMode): Promise<number> {
  const repos = createRepositories(env.DB);
  const topics = await repos.topics.listForReset(100);
  const matching = await filterTopicsByMode(env, topics, mode, 100);

  for (const topic of matching) {
    await repos.topics.resetToCandidate(topic.id);
  }

  return matching.length;
}

async function filterTopicsByMode(env: Env, topics: TopicRecord[], mode: CollectedItemMode, limit: number): Promise<TopicRecord[]> {
  const filtered: TopicRecord[] = [];

  for (const topic of topics) {
    const sources = await getTopicSources(env, topic);
    const hasTemporary = sources.some(isManualItem);

    if ((mode === "temporary" && hasTemporary) || (mode === "permanent" && !hasTemporary)) {
      filtered.push(topic);
    }

    if (filtered.length >= limit) {
      break;
    }
  }

  return filtered;
}

function isManualItem(item: { source_id?: string; metadata_json?: string | null }): boolean {
  return item.source_id === "src_manual_urls" || Boolean(item.metadata_json?.includes("\"ingestion_method\":\"manual_url\"") || item.metadata_json?.includes("\"ingestionMethod\":\"manual_url\""));
}

export async function getTopicSources(env: Env, topic: TopicRecord) {
  const repos = createRepositories(env.DB);
  return repos.collectedItems.getByIds(parseSourceItemIds(topic));
}

export function parseSourceItemIds(topic: TopicRecord): string[] {
  try {
    const parsed = JSON.parse(topic.source_item_ids_json) as unknown;
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function formatTopicMessage(topic: TopicRecord, sources: Array<{ title: string; canonical_url: string | null; published_at: string | null }>): string {
  const sourceLines = sources.slice(0, 3).map((source, index) => {
    const date = source.published_at ? source.published_at.slice(0, 10) : "no date";
    return `${index + 1}. ${escapeHtml(source.title)} (${date})`;
  });

  return [
    `<b>${escapeHtml(topic.title_ru ?? topic.title)}</b>`,
    "",
    `<b>Краткое описание:</b> ${escapeHtml(topic.summary_ru ?? topic.summary ?? "Нет описания")}`,
    `<b>Ценность:</b> ${escapeHtml(topic.why_it_matters_ru ?? topic.why_it_matters ?? "Нет объяснения")}`,
    `<b>Угол:</b> ${escapeHtml(topic.suggested_angle_ru ?? topic.suggested_angle ?? topic.angle ?? "Нет угла")}`,
    "",
    "<b>Источники:</b>",
    sourceLines.join("\n") || "No sources"
  ].join("\n");
}

export function formatTopicEnglish(topic: TopicRecord, sources: Array<{ title: string; canonical_url: string | null; published_at: string | null }>): string {
  const sourceLines = sources.slice(0, 3).map((source, index) => {
    const date = source.published_at ? source.published_at.slice(0, 10) : "no date";
    return `${index + 1}. ${escapeHtml(source.title)} (${date})`;
  });

  return [
    `<b>${escapeHtml(topic.title)}</b>`,
    "",
    `<b>Short description:</b> ${escapeHtml(topic.summary ?? "No description")}`,
    `<b>Value:</b> ${escapeHtml(topic.why_it_matters ?? "No explanation")}`,
    `<b>Angle:</b> ${escapeHtml(topic.suggested_angle ?? topic.angle ?? "No angle")}`,
    "",
    "<b>Sources:</b>",
    sourceLines.join("\n") || "No sources"
  ].join("\n");
}

export function formatTopicSources(topic: TopicRecord, sources: Array<{ title: string; canonical_url: string | null; published_at: string | null }>): string {
  const lines = sources.slice(0, 3).map((source, index) => {
    const date = source.published_at ? source.published_at.slice(0, 10) : "no date";
    return `${index + 1}. ${escapeHtml(source.title)}\n${escapeHtml(source.canonical_url ?? "")}\n${date}`;
  });

  return [`Источники тезиса: ${escapeHtml(topic.title_ru ?? topic.title)}`, "", lines.join("\n\n") || "Источники не найдены."].join("\n");
}

export function formatTopicWhy(topic: TopicRecord): string {
  return [
    `Почему предложен тезис: ${escapeHtml(topic.title_ru ?? topic.title)}`,
    "",
    `Объяснение: ${escapeHtml(topic.why_it_matters_ru ?? topic.ai_reasoning_summary ?? topic.why_it_matters ?? "Rule-based relevance and source fit.")}`,
    "",
    `English title: ${escapeHtml(topic.title)}`
  ].join("\n");
}

async function formatLatestSourceIssues(env: Env): Promise<string | null> {
  const repos = createRepositories(env.DB);
  const latestRun = await repos.processingRuns.latest();
  const errors = parseSourceErrors(latestRun?.source_errors_json ?? null).slice(0, 5);

  if (errors.length === 0) {
    return null;
  }

  const sources = await repos.sources.listAll();
  const byId = new Map(sources.map((source) => [source.id, source]));
  const lines = errors.map((error, index) => {
    const source = byId.get(error.sourceId);
    const label = source ? `${source.name} — ${source.url}` : error.sourceId;
    return `${index + 1}. ${escapeHtml(label)}\n${escapeHtml(error.message)}`;
  });

  return ["Не удалось обработать источники:", ...lines].join("\n");
}

function parseSourceErrors(value: string | null): Array<{ sourceId: string; message: string }> {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.flatMap((item) => {
      if (!item || typeof item !== "object") {
        return [];
      }
      const record = item as { sourceId?: unknown; message?: unknown };
      return typeof record.sourceId === "string" && typeof record.message === "string"
        ? [{ sourceId: record.sourceId, message: record.message }]
        : [];
    });
  } catch {
    return [];
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
