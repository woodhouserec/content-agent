import type { Env } from "../domain/runtime";

export interface LinkedInConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  apiVersion: string;
}

export function getLinkedInConfig(env: Env): LinkedInConfig {
  return {
    clientId: requireValue(env.LINKEDIN_CLIENT_ID, "LINKEDIN_CLIENT_ID"),
    clientSecret: requireValue(env.LINKEDIN_CLIENT_SECRET, "LINKEDIN_CLIENT_SECRET"),
    redirectUri: requireValue(env.LINKEDIN_REDIRECT_URI, "LINKEDIN_REDIRECT_URI"),
    apiVersion: normalizeApiVersion(env.LINKEDIN_API_VERSION || "202607")
  };
}

function requireValue(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function normalizeApiVersion(value: string): string {
  const normalized = value.trim();

  if (/^\d{8}$/.test(normalized)) {
    return normalized.slice(0, 6);
  }

  return normalized;
}
