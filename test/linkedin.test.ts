import assert from "node:assert/strict";
import test from "node:test";
import { LinkedInClient } from "../src/linkedin/client";
import { getLinkedInConfig } from "../src/linkedin/config";

test("LinkedIn authorization URL requests publish scope and state", () => {
  const url = new LinkedInClient({
    clientId: "client-id",
    clientSecret: "secret",
    redirectUri: "https://example.com/linkedin/oauth/callback",
    apiVersion: "202401"
  }).buildAuthorizationUrl("state123");
  const parsed = new URL(url);

  assert.equal(parsed.origin, "https://www.linkedin.com");
  assert.equal(parsed.searchParams.get("response_type"), "code");
  assert.equal(parsed.searchParams.get("client_id"), "client-id");
  assert.equal(parsed.searchParams.get("state"), "state123");
  assert.equal(parsed.searchParams.get("scope"), "openid profile w_member_social");
});

test("LinkedIn publish callback payload stays within Telegram callback_data limit", () => {
  const draftId = "draft_1234567890abcdef1234567890abcdef";
  assert.ok(`draft:publish:${draftId}`.length <= 64);
});

test("LinkedIn config uses current active API version by default", () => {
  const config = getLinkedInConfig({
    LINKEDIN_CLIENT_ID: "client-id",
    LINKEDIN_CLIENT_SECRET: "secret",
    LINKEDIN_REDIRECT_URI: "https://example.com/linkedin/oauth/callback"
  } as never);

  assert.equal(config.apiVersion, "202607");
});

test("LinkedIn config normalizes YYYYMMDD version values", () => {
  const config = getLinkedInConfig({
    LINKEDIN_CLIENT_ID: "client-id",
    LINKEDIN_CLIENT_SECRET: "secret",
    LINKEDIN_REDIRECT_URI: "https://example.com/linkedin/oauth/callback",
    LINKEDIN_API_VERSION: "20260701"
  } as never);

  assert.equal(config.apiVersion, "202607");
});
