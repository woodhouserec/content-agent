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
  timeoutMs: 4500,
  retries: 0,
  userAgent: "ContentAgent/0.2 (+https://github.com/woodhouserec/content-agent)"
};

const collectorConcurrency = 5;

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

  const results = await mapWithConcurrency(sources, collectorConcurrency, async (source) => {
    stats.processedSources += 1;
    const collector = getCollectorForSource(source);

    if (!collector) {
      return {
        source,
        result: null,
        error: {
          sourceId: source.id,
          stage: "config",
          message: `No collector registered for source type: ${source.type}`,
          recoverable: false
        } as CollectorError
      };
    }

    try {
      logger.info("Collecting source", {
        event: "source_collection_started",
        runId,
        sourceId: source.id,
        sourceType: source.type
      });

      return {
        source,
        result: await collector.collect(source, collectorConfig),
        error: null
      };
    } catch (error: unknown) {
      return {
        source,
        result: null,
        error: {
          sourceId: source.id,
          stage: "fetch",
          message: error instanceof Error ? error.message : String(error),
          recoverable: false
        } as CollectorError
      };
    }
  });

  for (const { source, result, error } of results) {
    if (error) {
      stats.failedSources += 1;
      stats.errors.push(error);
      continue;
    }

    if (!result) {
      continue;
    }

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
      } catch (itemError: unknown) {
        stats.errors.push({
          sourceId: source.id,
          stage: "item",
          message: itemError instanceof Error ? itemError.message : String(itemError),
          recoverable: true
        });
      }
    }
  }

  return stats;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  let index = 0;

  async function worker(): Promise<void> {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;
      results[currentIndex] = await mapper(items[currentIndex]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}
