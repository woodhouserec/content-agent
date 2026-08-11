import type { Env } from "../domain/runtime";

export interface LinkedInConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  apiVersion: string;
}

export interface LinkedInPublishConfig {
  apiVersion: string;
}

export function getLinkedInConfig(env: Env): LinkedInConfig {
  return {
    clientId: env.LINKEDIN_CLIENT_ID || "",
    clientSecret: env.LINKEDIN_CLIENT_SECRET || "",
    redirectUri: env.LINKEDIN_REDIRECT_URI || "",
    apiVersion: normalizeApiVersion(env.LINKEDIN_API_VERSION || "202607")
  };
}

export function getLinkedInPublishConfig(env: Env): LinkedInPublishConfig {
  return {
    apiVersion: normalizeApiVersion(env.LINKEDIN_API_VERSION || "202607")
  };
}

function normalizeApiVersion(value: string): string {
  const normalized = value.trim();

  if (/^\d{8}$/.test(normalized)) {
    return normalized.slice(0, 6);
  }

  return normalized;
}
