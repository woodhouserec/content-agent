import type { Env, ScheduledController } from "../domain/runtime";
import { runCollection } from "../pipeline/collection-runner";
import { createRepositories } from "../storage/repositories";
import { logger } from "../utils/logger";

export async function handleScheduled(controller: ScheduledController, env: Env): Promise<void> {
  await runScheduledCollection("cron", env, {
    cron: controller.cron,
    scheduledTime: controller.scheduledTime
  });
}

export async function runScheduledCollection(
  triggerType: "cron" | "manual",
  env: Env,
  metadata: Record<string, unknown>
): Promise<string> {
  const repos = createRepositories(env.DB);
  let runId: string | null = null;

  try {
    const run = await repos.processingRuns.create(triggerType, metadata);

    runId = run.id;

    logger.info("Scheduled processing run created", {
      event: "scheduled_run_created",
      runId,
      triggerType
    });

    const stats = await runCollection(env, run.id);

    await repos.processingRuns.completeWithStats(run.id, {
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
    });

    logger.info("Scheduled processing run completed", {
      event: "scheduled_run_completed",
      runId,
      newItems: stats.newItems,
      duplicateItems: stats.duplicateItems,
      failedSources: stats.failedSources
    });

    return run.id;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);

    if (runId) {
      try {
        await repos.processingRuns.fail(runId, message);
      } catch (failError: unknown) {
        logger.error("Failed to mark processing run as failed", {
          event: "processing_run_fail_update_failed",
          runId,
          originalError: message,
          failError: failError instanceof Error ? failError.message : String(failError)
        });
      }
    }

    logger.error("Scheduled processing run failed", {
      event: "scheduled_run_failed",
      runId,
      error: message
    });

    throw error;
  }
}
