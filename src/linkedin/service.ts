import type { Env } from "../domain/runtime";
import type { DraftRecord } from "../storage/drafts";
import { createRepositories } from "../storage/repositories";
import { R2AssetStorage } from "../visual/r2-storage";
import { getLinkedInConfig, getLinkedInPublishConfig } from "./config";
import { LinkedInClient } from "./client";

export async function createLinkedInConnectUrl(env: Env, input: { telegramUserId: string; telegramChatId: string }): Promise<string> {
  const repos = createRepositories(env.DB);
  const state = await repos.linkedin.createOauthState({
    telegramUserId: input.telegramUserId,
    telegramChatId: input.telegramChatId,
    ttlMinutes: 15
  });

  return new LinkedInClient(getLinkedInConfig(env)).buildAuthorizationUrl(state.state);
}

export async function completeLinkedInOAuth(env: Env, input: { code: string; state: string }): Promise<{ telegramChatId: string; memberId: string }> {
  const repos = createRepositories(env.DB);
  const state = await repos.linkedin.consumeOauthState(input.state);

  if (!state) {
    throw new Error("LinkedIn OAuth state is invalid or expired.");
  }

  const client = new LinkedInClient(getLinkedInConfig(env));
  const token = await client.exchangeCode(input.code);
  const user = await client.getUserInfo(token.access_token);
  const now = Date.now();

  await repos.linkedin.upsertConnection({
    telegramUserId: state.telegram_user_id,
    memberId: user.sub,
    authorUrn: `urn:li:person:${user.sub}`,
    accessToken: token.access_token,
    refreshToken: token.refresh_token ?? null,
    scope: token.scope ?? null,
    expiresAt: new Date(now + token.expires_in * 1000).toISOString(),
    refreshExpiresAt: token.refresh_token_expires_in ? new Date(now + token.refresh_token_expires_in * 1000).toISOString() : null
  });

  return {
    telegramChatId: state.telegram_chat_id,
    memberId: user.sub
  };
}

export async function publishDraftToLinkedIn(env: Env, input: { draftId: string; telegramUserId: string }): Promise<{ postUrn: string; alreadyPublished: boolean }> {
  const repos = createRepositories(env.DB);
  const draft = await requireApprovedDraft(env, input.draftId);
  const existing = await repos.linkedin.getPublicationForDraft(draft.id);

  if (existing?.linkedin_post_urn) {
    return {
      postUrn: existing.linkedin_post_urn,
      alreadyPublished: true
    };
  }

  const connection = await repos.linkedin.getConnection(input.telegramUserId);
  if (!connection) {
    throw new Error("LinkedIn is not connected. Нажмите «Подключить LinkedIn».");
  }

  if (new Date(connection.expires_at).getTime() <= Date.now()) {
    throw new Error("LinkedIn access token expired. Подключите LinkedIn заново.");
  }

  const publication = await repos.linkedin.createPublication({
    draftId: draft.id,
    telegramUserId: input.telegramUserId,
    authorUrn: connection.author_urn
  });

  try {
    const client = new LinkedInClient(getLinkedInPublishConfig(env));
    const approvedImage = await repos.visuals.getLatestApprovedAssetForDraft(draft.id);
    const postUrn = approvedImage
      ? await publishDraftWithImage(env, client, {
          accessToken: connection.access_token,
          authorUrn: connection.author_urn,
          text: draft.content,
          storageKey: approvedImage.storage_key,
          mimeType: approvedImage.mime_type
        })
      : await client.publishTextPost({
          accessToken: connection.access_token,
          authorUrn: connection.author_urn,
          text: draft.content
        });

    await repos.linkedin.markPublicationPublished(publication.id, postUrn);

    return {
      postUrn,
      alreadyPublished: false
    };
  } catch (error: unknown) {
    await repos.linkedin.markPublicationFailed(publication.id, error instanceof Error ? error.message : String(error));
    throw error;
  }
}

async function publishDraftWithImage(
  env: Env,
  client: LinkedInClient,
  input: {
    accessToken: string;
    authorUrn: string;
    text: string;
    storageKey: string;
    mimeType: string;
  }
): Promise<string> {
  const image = await new R2AssetStorage(env).get(input.storageKey);
  const imageUrn = await client.uploadImage({
    accessToken: input.accessToken,
    ownerUrn: input.authorUrn,
    bytes: image.bytes,
    mimeType: image.mimeType || input.mimeType
  });

  return client.publishImagePost({
    accessToken: input.accessToken,
    authorUrn: input.authorUrn,
    text: input.text,
    imageUrn,
    altText: "Editorial vector illustration accompanying this LinkedIn post."
  });
}

async function requireApprovedDraft(env: Env, draftId: string): Promise<DraftRecord> {
  const draft = await createRepositories(env.DB).drafts.getById(draftId);

  if (!draft) {
    throw new Error("Draft not found.");
  }

  if (draft.status !== "approved") {
    throw new Error("Only approved drafts can be published to LinkedIn.");
  }

  return draft;
}
