import assert from "node:assert/strict";
import test from "node:test";
import { LinkedInClient } from "../src/linkedin/client";
import { getLinkedInConfig, getLinkedInPublishConfig } from "../src/linkedin/config";

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

test("LinkedIn publish config does not require OAuth redirect URI", () => {
  const config = getLinkedInPublishConfig({} as never);

  assert.equal(config.apiVersion, "202607");
});

test("LinkedIn config creation is lenient but OAuth URL still requires redirect URI", () => {
  const config = getLinkedInConfig({
    LINKEDIN_CLIENT_ID: "client-id",
    LINKEDIN_CLIENT_SECRET: "secret"
  } as never);

  assert.equal(config.redirectUri, "");
  assert.throws(() => new LinkedInClient(config).buildAuthorizationUrl("state123"), /LINKEDIN_REDIRECT_URI/);
});

test("LinkedIn image post sends media content", async () => {
  const originalFetch = globalThis.fetch;
  const requests: Array<{ url: string; body: unknown }> = [];

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    requests.push({
      url: String(input),
      body: init?.body ? JSON.parse(String(init.body)) as unknown : null
    });

    return new Response("", {
      status: 201,
      headers: {
        "x-restli-id": "urn:li:share:123"
      }
    });
  }) as typeof fetch;

  try {
    const urn = await new LinkedInClient({ apiVersion: "202607" }).publishImagePost({
      accessToken: "token",
      authorUrn: "urn:li:person:abc",
      text: "Post text",
      imageUrn: "urn:li:image:image123",
      altText: "An editorial illustration"
    });

    assert.equal(urn, "urn:li:share:123");
    assert.equal(requests[0]?.url, "https://api.linkedin.com/rest/posts");
    assert.deepEqual(requests[0]?.body, {
      author: "urn:li:person:abc",
      commentary: "Post text",
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: []
      },
      content: {
        media: {
          id: "urn:li:image:image123",
          altText: "An editorial illustration"
        }
      },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
