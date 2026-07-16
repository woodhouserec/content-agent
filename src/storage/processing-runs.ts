import type { D1Database } from "../domain/runtime";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";

export type ProcessingRunStatus = "running" | "completed" | "failed";
export type ProcessingRunTrigger = "cron" | "manual";

export interface ProcessingRun {
  id: string;
  trigger_type: ProcessingRunTrigger;
  status: ProcessingRunStatus;
  started_at: string;
  finished_at: string | null;
  collected_count: number;
  normalized_count: number;
  deduplicated_count: number;
  scored_count: number;
  selected_topics_count: number;
  error_message: string | null;
  metadata_json: string | null;
}

export class ProcessingRunsRepository {
  constructor(private readonly db: D1Database) {}

  async create(triggerType: ProcessingRunTrigger, metadata?: Record<string, unknown>): Promise<ProcessingRun> {
    const run: ProcessingRun = {
      id: createId("run"),
      trigger_type: triggerType,
      status: "running",
      started_at: nowIso(),
      finished_at: null,
      collected_count: 0,
      normalized_count: 0,
      deduplicated_count: 0,
      scored_count: 0,
      selected_topics_count: 0,
      error_message: null,
      metadata_json: metadata ? JSON.stringify(metadata) : null
    };

    await this.db
      .prepare(
        `INSERT INTO processing_runs (
          id, trigger_type, status, started_at, finished_at,
          collected_count, normalized_count, deduplicated_count, scored_count,
          selected_topics_count, error_message, metadata_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        run.id,
        run.trigger_type,
        run.status,
        run.started_at,
        run.finished_at,
        run.collected_count,
        run.normalized_count,
        run.deduplicated_count,
        run.scored_count,
        run.selected_topics_count,
        run.error_message,
        run.metadata_json
      )
      .run();

    return run;
  }

  async complete(id: string): Promise<void> {
    await this.db
      .prepare("UPDATE processing_runs SET status = ?, finished_at = ? WHERE id = ?")
      .bind("completed", nowIso(), id)
      .run();
  }

  async fail(id: string, errorMessage: string): Promise<void> {
    await this.db
      .prepare("UPDATE processing_runs SET status = ?, finished_at = ?, error_message = ? WHERE id = ?")
      .bind("failed", nowIso(), errorMessage, id)
      .run();
  }

  async latest(): Promise<ProcessingRun | null> {
    return this.db
      .prepare("SELECT * FROM processing_runs ORDER BY started_at DESC LIMIT 1")
      .first<ProcessingRun>();
  }
}
