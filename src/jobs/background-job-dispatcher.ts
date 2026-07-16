import type { ExecutionContext } from "../domain/runtime";
import { logger } from "../utils/logger";

export interface BackgroundJobDispatcher {
  dispatch(name: string, job: () => Promise<void>): void;
}

export class WaitUntilBackgroundJobDispatcher implements BackgroundJobDispatcher {
  constructor(
    private readonly ctx: ExecutionContext,
    private readonly requestId: string
  ) {}

  dispatch(name: string, job: () => Promise<void>): void {
    this.ctx.waitUntil(
      job().catch((error: unknown) => {
        logger.error("Background job failed", {
          event: "background_job_failed",
          requestId: this.requestId,
          jobName: name,
          error: error instanceof Error ? error.message : String(error)
        });
      })
    );
  }
}
