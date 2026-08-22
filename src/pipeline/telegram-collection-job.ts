import type { Env } from "../domain/runtime";
import type { TelegramClient } from "../telegram/client";
import { createRepositories } from "../storage/repositories";
import type { ProcessingRun } from "../storage/processing-runs";
import {
  collectSources,
  emptyCollectionRunStats,
  mergeCollectionRunStats,
  type CollectionRunStats
} from "./collection-runner";
import { logger } from "../utils/logger";

interface TelegramCollectionJobMetadata {
  kind: "telegram_collection_job";
  telegramChatId: string;
  requestId: string;
  sourceIds: string[];
  cursor: number;
  notifiedStarted: boolean;
  notifiedCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

const chunkSize = 4;
const maxRuntimeMs = 22_000;

export async function createTelegramCollectionJob(
  env: Env,
  input: {
    telegramChatId: string;
    requestId: string;
  }
): Promise<{ runId: string; sourceCount: number }> {
  const repos = createRepositories(env.DB);
  const sources = await repos.sources.listEnabled();
  const now = new Date().toISOString();
  const run = await repos.processingRuns.create("manual", {
    kind: "telegram_collection_job",
    telegramChatId: input.telegramChatId,
    requestId: input.requestId,
    sourceIds: sources.map((source) => source.id),
    cursor: 0,
    notifiedStarted: true,
    notifiedCompleted: false,
    createdAt: now,
    updatedAt: now
  } satisfies TelegramCollectionJobMetadata);

  return { runId: run.id, sourceCount: sources.length };
}

export async function processTelegramCollectionJob(
  env: Env,
  telegram: TelegramClient,
  runId: string
): Promise<"completed" | "pending" | "missing"> {
  const repos = createRepositories(env.DB);
  const run = await repos.processingRuns.getById(runId);

  if (!run || run.status !== "running") {
    return run ? "completed" : "missing";
  }

  const metadata = parseMetadata(run.metadata_json);
  if (!metadata) {
    await repos.processingRuns.fail(run.id, "Invalid telegram collection job metadata.");
    return "completed";
  }

  const startedAt = Date.now();
  let cursor = metadata.cursor;
  const stats = statsFromRun(run);

  while (cursor < metadata.sourceIds.length && Date.now() - startedAt < maxRuntimeMs) {
    const sourceIds = metadata.sourceIds.slice(cursor, cursor + chunkSize);
    const sources = await repos.sources.getByIds(sourceIds);
    const chunkStats = await collectSources(env, run.id, sources);

    mergeCollectionRunStats(stats, chunkStats);
    cursor += sourceIds.length;

    const nextMetadata: TelegramCollectionJobMetadata = {
      ...metadata,
      cursor,
      updatedAt: new Date().toISOString()
    };
    await repos.processingRuns.updateProgress(run.id, statsToProgress(stats, nextMetadata));
  }

  if (cursor >= metadata.sourceIds.length) {
    const finishedMetadata: TelegramCollectionJobMetadata = {
      ...metadata,
      cursor,
      notifiedCompleted: true,
      updatedAt: new Date().toISOString()
    };
    await repos.processingRuns.updateProgress(run.id, statsToProgress(stats, finishedMetadata));
    await repos.processingRuns.completeWithStats(run.id, statsToCompleteInput(stats));
    await telegram.sendMessage(metadata.telegramChatId, formatCollectionFinishedMessage(stats));
    return "completed";
  }

  logger.info("Telegram collection job paused for next tick", {
    event: "telegram_collection_job_paused",
    runId,
    cursor,
    totalSources: metadata.sourceIds.length
  });

  return "pending";
}

export async function processPendingTelegramCollectionJobs(env: Env, telegram: TelegramClient): Promise<number> {
  const repos = createRepositories(env.DB);
  const runs = await repos.processingRuns.listRunningTelegramCollectionJobs(1);
  let processed = 0;

  for (const run of runs) {
    await processTelegramCollectionJob(env, telegram, run.id);
    processed += 1;
  }

  return processed;
}

export function formatCollectionFinishedMessage(stats: CollectionRunStats): string {
  const sourceErrors = stats.errors
    .slice(0, 5)
    .map((error, index) => `${index + 1}. ${formatSourceErrorLabel(error)}\n${error.stage} - ${error.message}`);

  return [
    "Сбор материалов завершён.",
    `Источников обработано: ${stats.processedSources}`,
    `Успешных источников: ${stats.successfulSources}`,
    `Ошибок источников: ${stats.failedSources}`,
    `Новых материалов: ${stats.newItems}`,
    `Дублей: ${stats.duplicateItems}`,
    ...(sourceErrors.length > 0 ? ["", "Первые ошибки источников:", ...sourceErrors] : []),
    "",
    "Теперь можно нажать «Сгенерировать тезисы»."
  ].join("\n");
}

function formatSourceErrorLabel(error: CollectionRunStats["errors"][number]): string {
  const name = error.sourceName ?? error.sourceId;
  return error.sourceUrl ? `${name} — ${error.sourceUrl}` : name;
}

function parseMetadata(value: string | null): TelegramCollectionJobMetadata | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<TelegramCollectionJobMetadata>;
    if (
      parsed.kind !== "telegram_collection_job"
      || typeof parsed.telegramChatId !== "string"
      || typeof parsed.requestId !== "string"
      || !Array.isArray(parsed.sourceIds)
    ) {
      return null;
    }

    return {
      kind: "telegram_collection_job",
      telegramChatId: parsed.telegramChatId,
      requestId: parsed.requestId,
      sourceIds: parsed.sourceIds.filter((id): id is string => typeof id === "string"),
      cursor: typeof parsed.cursor === "number" ? parsed.cursor : 0,
      notifiedStarted: parsed.notifiedStarted === true,
      notifiedCompleted: parsed.notifiedCompleted === true,
      createdAt: typeof parsed.createdAt === "string" ? parsed.createdAt : new Date().toISOString(),
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString()
    };
  } catch {
    return null;
  }
}

function statsFromRun(run: ProcessingRun): CollectionRunStats {
  const stats = emptyCollectionRunStats();
  stats.processedSources = run.processed_sources_count;
  stats.successfulSources = run.successful_sources_count;
  stats.failedSources = run.failed_sources_count;
  stats.receivedItems = run.received_items_count;
  stats.normalizedItems = run.normalized_count;
  stats.newItems = run.new_items_count;
  stats.duplicateItems = run.duplicate_items_count;
  stats.errors = parseErrors(run.source_errors_json);
  return stats;
}

function parseErrors(value: string | null): CollectionRunStats["errors"] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed as CollectionRunStats["errors"] : [];
  } catch {
    return [];
  }
}

function statsToProgress(stats: CollectionRunStats, metadata: TelegramCollectionJobMetadata) {
  return {
    ...statsToCompleteInput(stats),
    metadata
  };
}

function statsToCompleteInput(stats: CollectionRunStats) {
  return {
    collectedCount: stats.receivedItems,
    normalizedCount: stats.normalizedItems,
    deduplicatedCount: stats.duplicateItems,
    processedSourcesCount: stats.processedSources,
    successfulSourcesCount: stats.successfulSources,
    failedSourcesCount: stats.failedSources,
    receivedItemsCount: stats.receivedItems,
    newItemsCount: stats.newItems,
    duplicateItemsCount: stats.duplicateItems,
    sourceErrors: stats.errors
  };
}
