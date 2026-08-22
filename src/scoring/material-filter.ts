import type { RelevanceProfileRecord } from "../storage/relevance-profiles";
import { parsePreferenceMemory } from "../storage/relevance-profiles";

export const defaultMaterialMaxAgeDays = 7;
export const allowedMaterialMaxAgeDays = [7, 5, 3, 1] as const;

export interface MaterialFreshnessFilter {
  maxContentAgeDays: number;
  sinceIso: string;
}

export function getMaterialMaxAgeDays(profile: Pick<RelevanceProfileRecord, "memory_json"> | null): number {
  if (!profile) {
    return defaultMaterialMaxAgeDays;
  }

  const memory = parsePreferenceMemory(profile.memory_json);
  const value = memory.material_filter?.max_content_age_days;
  return isAllowedMaterialMaxAgeDays(value) ? value : defaultMaterialMaxAgeDays;
}

export function createMaterialFreshnessFilter(
  profile: Pick<RelevanceProfileRecord, "memory_json"> | null,
  now = new Date()
): MaterialFreshnessFilter {
  const maxContentAgeDays = getMaterialMaxAgeDays(profile);
  const since = new Date(now.getTime() - maxContentAgeDays * 24 * 60 * 60 * 1000);

  return {
    maxContentAgeDays,
    sinceIso: since.toISOString()
  };
}

export function isAllowedMaterialMaxAgeDays(value: unknown): value is typeof allowedMaterialMaxAgeDays[number] {
  return typeof value === "number" && allowedMaterialMaxAgeDays.includes(value as typeof allowedMaterialMaxAgeDays[number]);
}
