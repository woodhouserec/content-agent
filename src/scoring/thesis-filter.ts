import type { RelevanceProfileRecord } from "../storage/relevance-profiles";
import { parsePreferenceMemory } from "../storage/relevance-profiles";
import { scoringConfig } from "./config";

export const minTopicsPerRun = 1;

export function getMaxTopicsPerRun(profile: Pick<RelevanceProfileRecord, "memory_json"> | null): number {
  if (!profile) {
    return scoringConfig.maxTopicsPerRun;
  }

  const memory = parsePreferenceMemory(profile.memory_json);
  const value = memory.thesis_filter?.max_topics_per_run;
  return clampMaxTopicsPerRun(value ?? scoringConfig.maxTopicsPerRun);
}

export function clampMaxTopicsPerRun(value: number): number {
  if (!Number.isFinite(value)) {
    return scoringConfig.maxTopicsPerRun;
  }

  return Math.max(minTopicsPerRun, Math.round(value));
}
