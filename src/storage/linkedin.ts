import type { D1Database } from "../domain/runtime";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";

export interface LinkedInOauthStateRecord {
  state: string;
  telegram_user_id: string;
  telegram_chat_id: string;
  created_at: string;
  expires_at: string;
  used_at: string | null;
}

export interface LinkedInConnectionRecord {
  id: string;
  telegram_user_id: string;
  member_id: string;
  author_urn: string;
  access_token: string;
  refresh_token: string | null;
  scope: string | null;
  expires_at: string;
  refresh_expires_at: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface LinkedInPublicationRecord {
  id: string;
  draft_id: string;
  telegram_user_id: string;
  author_urn: string;
  linkedin_post_urn: string | null;
  status: string;
  error_message: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export class LinkedInRepository {
  constructor(private readonly db: D1Database) {}

  async createOauthState(input: { telegramUserId: string; telegramChatId: string; ttlMinutes: number }): Promise<LinkedInOauthStateRecord> {
    const timestamp = nowIso();
    const expiresAt = new Date(Date.now() + input.ttlMinutes * 60_000).toISOString();
    const state = crypto.randomUUID().replace(/-/g, "");

    await this.db
      .prepare(
        `INSERT INTO linkedin_oauth_states (state, telegram_user_id, telegram_chat_id, created_at, expires_at, used_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(state, input.telegramUserId, input.telegramChatId, timestamp, expiresAt, null)
      .run();

    return {
      state,
      telegram_user_id: input.telegramUserId,
      telegram_chat_id: input.telegramChatId,
      created_at: timestamp,
      expires_at: expiresAt,
      used_at: null
    };
  }

  async consumeOauthState(state: string): Promise<LinkedInOauthStateRecord | null> {
    const record = await this.db
      .prepare("SELECT * FROM linkedin_oauth_states WHERE state = ? LIMIT 1")
      .bind(state)
      .first<LinkedInOauthStateRecord>();

    if (!record || record.used_at || new Date(record.expires_at).getTime() < Date.now()) {
      return null;
    }

    await this.db
      .prepare("UPDATE linkedin_oauth_states SET used_at = ? WHERE state = ?")
      .bind(nowIso(), state)
      .run();

    return record;
  }

  async upsertConnection(input: {
    telegramUserId: string;
    memberId: string;
    authorUrn: string;
    accessToken: string;
    refreshToken: string | null;
    scope: string | null;
    expiresAt: string;
    refreshExpiresAt: string | null;
  }): Promise<LinkedInConnectionRecord> {
    const timestamp = nowIso();
    const id = createId("li");

    await this.db
      .prepare(
        `INSERT INTO linkedin_connections (
           id, telegram_user_id, member_id, author_urn, access_token, refresh_token,
           scope, expires_at, refresh_expires_at, status, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(telegram_user_id) DO UPDATE SET
           member_id = excluded.member_id,
           author_urn = excluded.author_urn,
           access_token = excluded.access_token,
           refresh_token = excluded.refresh_token,
           scope = excluded.scope,
           expires_at = excluded.expires_at,
           refresh_expires_at = excluded.refresh_expires_at,
           status = excluded.status,
           updated_at = excluded.updated_at`
      )
      .bind(
        id,
        input.telegramUserId,
        input.memberId,
        input.authorUrn,
        input.accessToken,
        input.refreshToken,
        input.scope,
        input.expiresAt,
        input.refreshExpiresAt,
        "active",
        timestamp,
        timestamp
      )
      .run();

    const record = await this.getConnection(input.telegramUserId);
    if (!record) {
      throw new Error("LinkedIn connection was not saved");
    }

    return record;
  }

  async getConnection(telegramUserId: string): Promise<LinkedInConnectionRecord | null> {
    return this.db
      .prepare("SELECT * FROM linkedin_connections WHERE telegram_user_id = ? AND status = 'active' LIMIT 1")
      .bind(telegramUserId)
      .first<LinkedInConnectionRecord>();
  }

  async getPublicationForDraft(draftId: string): Promise<LinkedInPublicationRecord | null> {
    return this.db
      .prepare("SELECT * FROM linkedin_publications WHERE draft_id = ? AND status = 'published' ORDER BY published_at DESC LIMIT 1")
      .bind(draftId)
      .first<LinkedInPublicationRecord>();
  }

  async createPublication(input: { draftId: string; telegramUserId: string; authorUrn: string }): Promise<LinkedInPublicationRecord> {
    const id = createId("lipub");
    const timestamp = nowIso();

    await this.db
      .prepare(
        `INSERT INTO linkedin_publications (
          id, draft_id, telegram_user_id, author_urn, linkedin_post_urn,
          status, error_message, published_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(id, input.draftId, input.telegramUserId, input.authorUrn, null, "publishing", null, null, timestamp, timestamp)
      .run();

    const record = await this.db
      .prepare("SELECT * FROM linkedin_publications WHERE id = ? LIMIT 1")
      .bind(id)
      .first<LinkedInPublicationRecord>();

    if (!record) {
      throw new Error("LinkedIn publication record was not created");
    }

    return record;
  }

  async markPublicationPublished(id: string, postUrn: string): Promise<void> {
    await this.db
      .prepare(
        `UPDATE linkedin_publications
         SET status = 'published', linkedin_post_urn = ?, published_at = ?, updated_at = ?
         WHERE id = ?`
      )
      .bind(postUrn, nowIso(), nowIso(), id)
      .run();
  }

  async markPublicationFailed(id: string, errorMessage: string): Promise<void> {
    await this.db
      .prepare(
        `UPDATE linkedin_publications
         SET status = 'failed', error_message = ?, updated_at = ?
         WHERE id = ?`
      )
      .bind(errorMessage.slice(0, 500), nowIso(), id)
      .run();
  }
}
