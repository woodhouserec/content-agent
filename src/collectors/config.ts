import type { SourceConfig } from "./types";

export function parseSourceConfig(configJson: string | null): SourceConfig {
  if (!configJson) {
    return {};
  }

  try {
    const parsed = JSON.parse(configJson) as unknown;
    return typeof parsed === "object" && parsed !== null ? (parsed as SourceConfig) : {};
  } catch {
    return {};
  }
}

export function getSourceLimit(configJson: string | null, defaultLimit: number, maxLimit: number): number {
  const config = parseSourceConfig(configJson);
  const rawLimit = typeof config.max_items_per_run === "number"
    ? config.max_items_per_run
    : typeof config.limit === "number"
      ? config.limit
      : defaultLimit;
  return Math.max(1, Math.min(maxLimit, Math.floor(rawLimit)));
}
