import { getCollectorForSource } from "../collectors";
import type { CollectorConfig, CollectorError } from "../collectors/types";
import type { Env } from "../domain/runtime";
import { logger } from "../utils/logger";
import { createRepositories } from "../storage/repositories";
import { normalizeCollectorItem } from "./normalization";

export interface CollectionRunStats {
  processedSources: number;
  successfulSources: number;
  failedSources: number;
  receivedItems: number;
  normalizedItems: number;
  newItems: number;
  duplicateItems: number;
  errors: CollectorError[];
}

const collectorConfig: CollectorConfig = {
  maxItemsPerSource: 10,
  timeoutMs: 5000,
  retries: 1,
  userAgent: "ContentAgent/0.2 (+https://github.com/woodhouserec/content-agent)"
};

export async function runCollection(env: Env, runId: string): Promise<CollectionRunStats> {
  const repos = createRepositories(env.DB);
  const sources = await repos.sources.listEnabled();
  const stats: CollectionRunStats = {
    processedSources: 0,
    successfulSources: 0,
    failedSources: 0,
    receivedItems: 0,
    normalizedItems: 0,
    newItems: 0,
    duplicateItems: 0,
    errors: []
  };

  for (const source of sources) {
    stats.processedSources += 1;
    const collector = getCollectorForSource(source);

    if (!collector) {
      stats.failedSources += 1;
      stats.errors.push({
        sourceId: source.id,
        stage: "config",
        message: `No collector registered for source type: ${source.type}`,
        recoverable: false
      });
      continue;
    }

    try {
      logger.info("Collecting source", {
        event: "source_collection_started",
        runId,
        sourceId: source.id,
        sourceType: source.type
      });

      const result = await collector.collect(source, collectorConfig);
      stats.errors.push(...result.errors);
      stats.receivedItems += result.items.length;

      if (result.ok) {
        stats.successfulSources += 1;
      } else {
        stats.failedSources += 1;
      }

      for (const item of result.items) {
        try {
          const normalized = await normalizeCollectorItem(item);
          stats.normalizedItems += 1;
          const saveResult = await repos.collectedItems.upsertCollectedItem(normalized);

          if (saveResult.inserted) {
            stats.newItems += 1;
          } else {
            stats.duplicateItems += 1;
          }
        } catch (error: unknown) {
          stats.errors.push({
            sourceId: source.id,
            stage: "item",
            message: error instanceof Error ? error.message : String(error),
            recoverable: true
          });
        }
      }
    } catch (error: unknown) {
      stats.failedSources += 1;
      stats.errors.push({
        sourceId: source.id,
        stage: "fetch",
        message: error instanceof Error ? error.message : String(error),
        recoverable: false
      });
    }
  }

  return stats;
}
