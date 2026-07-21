import type { Env } from "../domain/runtime";
import { runScoring } from "../scoring/scoring-runner";
import type { CollectedItemMode } from "../storage/collected-items";
import { createRepositories } from "../storage/repositories";
import type { TopicRecord } from "../storage/topics";
import type { TelegramClient } from "./client";

export async function runScoringAndSendTopics(env: Env, telegram: TelegramClient, chatId: string, mode?: CollectedItemMode): Promise<void> {
  const result = await runScoring(env, { mode });
  await telegram.sendMessage(
    chatId,
    [
      `Scoring завершён${mode ? ` (${mode === "temporary" ? "временные источники" : "постоянные источники"})` : ""}.`,
      `Материалов оценено: ${result.scoredItems}`,
      `OpenAI-запросов: ${result.aiRequests}`,
      `Fallback без OpenAI: ${result.usedAiFallback ? "да" : "нет"}`,
      `Новых тем: ${result.topicsCreated}`,
      `Дубликатов тем: ${result.topicsSkippedAsDuplicates}`
    ].join("\n")
  );
  await sendLatestTopics(env, telegram, chatId, mode);
}

export async function sendLatestTopics(env: Env, telegram: TelegramClient, chatId: string, mode?: CollectedItemMode): Promise<void> {
  const repos = createRepositories(env.DB);
  const allTopics = await repos.topics.listAvailable(10);
  const topics = mode ? await filterTopicsByMode(env, allTopics, mode, 5) : allTopics.slice(0, 5);

  if (topics.length === 0) {
    await telegram.sendMessage(chatId, "Пока нет доступных тем. Сначала запустите /score после /collect.");
    return;
  }

  for (const topic of topics) {
    const sources = await getTopicSources(env, topic);
    await telegram.sendMessage(chatId, formatTopicMessage(topic, sources), {
      replyMarkup: {
        inline_keyboard: [
          [{ text: "Выбрать тему", callback_data: `topic:select:${topic.id}` }],
          [
            { text: "Пропустить", callback_data: `topic:skip:${topic.id}` },
            { text: "Показать источники", callback_data: `topic:sources:${topic.id}` }
          ],
          [{ text: "Почему выбрано", callback_data: `topic:why:${topic.id}` }]
        ]
      }
    });
    await repos.topics.markSent(topic.id);
  }
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
    `<b>${escapeHtml(topic.title)}</b>`,
    "",
    `<b>Why it matters:</b> ${escapeHtml(topic.why_it_matters ?? topic.summary ?? "No explanation")}`,
    `<b>Angle:</b> ${escapeHtml(topic.suggested_angle ?? topic.angle ?? "No angle")}`,
    `<b>Score:</b> ${Math.round(topic.relevance_score)}`,
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

  return [`Источники темы: ${escapeHtml(topic.title)}`, "", lines.join("\n\n") || "Источники не найдены."].join("\n");
}

export function formatTopicWhy(topic: TopicRecord): string {
  return [
    `Почему выбрано: ${escapeHtml(topic.title)}`,
    "",
    `Score: ${Math.round(topic.relevance_score)}`,
    `Novelty: ${Math.round(topic.novelty_score ?? 0)}`,
    `Reasoning: ${escapeHtml(topic.ai_reasoning_summary ?? topic.why_it_matters ?? "Rule-based scoring and source relevance.")}`
  ].join("\n");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
