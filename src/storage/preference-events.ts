import type { D1Database } from "../domain/runtime";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";

export class PreferenceEventsRepository {
  constructor(private readonly db: D1Database) {}

  async create(input: {
    profileId: string;
    eventType: string;
    targetType: string;
    targetId: string;
    signal: string;
    metadata?: unknown;
  }): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO preference_events (
          id, profile_id, event_type, target_type, target_id, signal, metadata_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        createId("pref"),
        input.profileId,
        input.eventType,
        input.targetType,
        input.targetId,
        input.signal.slice(0, 800),
        input.metadata ? JSON.stringify(input.metadata).slice(0, 2000) : null,
        nowIso()
      )
      .run();
  }
}
