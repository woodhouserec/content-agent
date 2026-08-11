import type { LinkedInConfig, LinkedInPublishConfig } from "./config";

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
  constructor(private readonly config: LinkedInConfig | LinkedInPublishConfig) {}

  buildAuthorizationUrl(state: string): string {
    const config = requireOauthConfig(this.config);
    const url = new URL("https://www.linkedin.com/oauth/v2/authorization");
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", config.clientId);
    url.searchParams.set("redirect_uri", config.redirectUri);
    url.searchParams.set("scope", "openid profile w_member_social");
    url.searchParams.set("state", state);
    return url.toString();
  }

  async exchangeCode(code: string): Promise<LinkedInTokenResponse> {
    const config = requireOauthConfig(this.config);
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: config.redirectUri,
      client_id: config.clientId,
      client_secret: config.clientSecret
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
    return this.createPost({
      accessToken: input.accessToken,
      body: {
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
      }
    });
  }

  async uploadImage(input: {
    accessToken: string;
    ownerUrn: string;
    bytes: ArrayBuffer;
    mimeType: string;
  }): Promise<string> {
    const initialized = await fetch("https://api.linkedin.com/rest/images?action=initializeUpload", {
      method: "POST",
      headers: {
        "authorization": `Bearer ${input.accessToken}`,
        "content-type": "application/json",
        "Linkedin-Version": this.config.apiVersion,
        "X-Restli-Protocol-Version": "2.0.0"
      },
      body: JSON.stringify({
        initializeUploadRequest: {
          owner: input.ownerUrn
        }
      })
    });

    if (!initialized.ok) {
      throw new Error(`LinkedIn image upload init failed: HTTP ${initialized.status} ${await initialized.text()}`);
    }

    const upload = await initialized.json() as {
      value?: {
        uploadUrl?: string;
        image?: string;
      };
    };
    const uploadUrl = upload.value?.uploadUrl;
    const imageUrn = upload.value?.image;

    if (!uploadUrl || !imageUrn) {
      throw new Error("LinkedIn image upload init did not include uploadUrl and image URN.");
    }

    const uploaded = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "authorization": `Bearer ${input.accessToken}`,
        "content-type": input.mimeType
      },
      body: input.bytes
    });

    if (!uploaded.ok) {
      throw new Error(`LinkedIn image upload failed: HTTP ${uploaded.status} ${await uploaded.text()}`);
    }

    return imageUrn;
  }

  async publishImagePost(input: {
    accessToken: string;
    authorUrn: string;
    text: string;
    imageUrn: string;
    altText: string;
  }): Promise<string> {
    return this.createPost({
      accessToken: input.accessToken,
      body: {
        author: input.authorUrn,
        commentary: input.text,
        visibility: "PUBLIC",
        distribution: {
          feedDistribution: "MAIN_FEED",
          targetEntities: [],
          thirdPartyDistributionChannels: []
        },
        content: {
          media: {
            id: input.imageUrn,
            altText: input.altText.slice(0, 4086)
          }
        },
        lifecycleState: "PUBLISHED",
        isReshareDisabledByAuthor: false
      }
    });
  }

  private async createPost(input: { accessToken: string; body: Record<string, unknown> }): Promise<string> {
    const response = await fetch("https://api.linkedin.com/rest/posts", {
      method: "POST",
      headers: {
        "authorization": `Bearer ${input.accessToken}`,
        "content-type": "application/json",
        "Linkedin-Version": this.config.apiVersion,
        "X-Restli-Protocol-Version": "2.0.0"
      },
      body: JSON.stringify(input.body)
    });

    if (!response.ok) {
      throw new Error(`LinkedIn post publish failed: HTTP ${response.status} ${await response.text()}`);
    }

    return response.headers.get("x-restli-id") ?? "published";
  }
}

function requireOauthConfig(config: LinkedInConfig | LinkedInPublishConfig): LinkedInConfig {
  if ("clientId" in config && "clientSecret" in config && "redirectUri" in config) {
    if (!config.clientId) {
      throw new Error("Missing required environment variable: LINKEDIN_CLIENT_ID");
    }

    if (!config.clientSecret) {
      throw new Error("Missing required environment variable: LINKEDIN_CLIENT_SECRET");
    }

    if (!config.redirectUri) {
      throw new Error("Missing required environment variable: LINKEDIN_REDIRECT_URI");
    }

    return config;
  }

  throw new Error("LinkedIn OAuth config is required for this operation.");
}
