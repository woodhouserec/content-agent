import type { LinkedInConfig } from "./config";

export interface LinkedInTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  scope?: string;
}

export interface LinkedInUserInfo {
  sub: string;
  name?: string;
}

export class LinkedInClient {
  constructor(private readonly config: LinkedInConfig) {}

  buildAuthorizationUrl(state: string): string {
    const url = new URL("https://www.linkedin.com/oauth/v2/authorization");
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", this.config.clientId);
    url.searchParams.set("redirect_uri", this.config.redirectUri);
    url.searchParams.set("scope", "openid profile w_member_social");
    url.searchParams.set("state", state);
    return url.toString();
  }

  async exchangeCode(code: string): Promise<LinkedInTokenResponse> {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: this.config.redirectUri,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret
    });

    const response = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded"
      },
      body
    });

    if (!response.ok) {
      throw new Error(`LinkedIn token exchange failed: HTTP ${response.status} ${await response.text()}`);
    }

    return response.json() as Promise<LinkedInTokenResponse>;
  }

  async getUserInfo(accessToken: string): Promise<LinkedInUserInfo> {
    const response = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: {
        "authorization": `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`LinkedIn userinfo failed: HTTP ${response.status} ${await response.text()}`);
    }

    const data = await response.json() as Partial<LinkedInUserInfo>;
    if (!data.sub) {
      throw new Error("LinkedIn userinfo did not include member id.");
    }

    return {
      sub: data.sub,
      name: data.name
    };
  }

  async publishTextPost(input: { accessToken: string; authorUrn: string; text: string }): Promise<string> {
    const response = await fetch("https://api.linkedin.com/rest/posts", {
      method: "POST",
      headers: {
        "authorization": `Bearer ${input.accessToken}`,
        "content-type": "application/json",
        "Linkedin-Version": this.config.apiVersion,
        "X-Restli-Protocol-Version": "2.0.0"
      },
      body: JSON.stringify({
        author: input.authorUrn,
        commentary: input.text,
        visibility: "PUBLIC",
        distribution: {
          feedDistribution: "MAIN_FEED",
          targetEntities: [],
          thirdPartyDistributionChannels: []
        },
        lifecycleState: "PUBLISHED",
        isReshareDisabledByAuthor: false
      })
    });

    if (!response.ok) {
      throw new Error(`LinkedIn post publish failed: HTTP ${response.status} ${await response.text()}`);
    }

    return response.headers.get("x-restli-id") ?? "published";
  }
}
