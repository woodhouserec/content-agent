import type { Env, ScheduledController } from "../domain/runtime";
import { createRepositories } from "../storage/repositories";
import { logger } from "../utils/logger";

export async function handleScheduled(controller: ScheduledController, env: Env): Promise<void> {
  const repos = createRepositories(env.DB);
  let runId: string | null = null;

  try {
    const run = await repos.processingRuns.create("cron", {
      cron: controller.cron,
      scheduledTime: controller.scheduledTime,
      note: "First vertical slice: no collectors are executed yet."
    });

    runId = run.id;

    logger.info("Scheduled processing run created", {
      event: "scheduled_run_created",
      runId,
      cron: controller.cron
    });

    await repos.processingRuns.complete(run.id);

    logger.info("Scheduled processing run completed", {
      event: "scheduled_run_completed",
      runId
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);

    if (runId) {
      await repos.processingRuns.fail(runId, message);
    }

    logger.error("Scheduled processing run failed", {
      event: "scheduled_run_failed",
      runId,
      error: message
    });

    throw error;
  }
}
