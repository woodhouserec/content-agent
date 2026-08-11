import type { Env } from "../domain/runtime";
import { createRepositories } from "../storage/repositories";
import { emptyPreferenceMemory, parsePreferenceMemory, type PreferenceMemory } from "../storage/relevance-profiles";
import { nowIso } from "../utils/time";

const maxMemoryItems = 10;

export async function getActivePreferenceMemory(env: Env): Promise<PreferenceMemory> {
  const profile = await createRepositories(env.DB).relevanceProfiles.getActive();
  return profile ? parsePreferenceMemory(profile.memory_json) : emptyPreferenceMemory();
}

export function formatPreferenceMemoryForPrompt(memory: PreferenceMemory): string {
  const sections = [
    formatSection("Writing preferences", memory.writing_preferences),
    formatSection("Visual preferences", memory.visual_preferences),
    formatSection("Topic preferences", memory.topic_preferences),
    formatSection("Avoid", memory.avoid)
  ].filter(Boolean);

  return sections.length > 0 ? sections.join("\n") : "No learned preferences yet.";
}

export async function rememberPreference(env: Env, input: {
  eventType: string;
  targetType: string;
  targetId: string;
  signal: string;
  section: keyof Pick<PreferenceMemory, "writing_preferences" | "visual_preferences" | "topic_preferences" | "avoid">;
  metadata?: unknown;
}): Promise<void> {
  const repos = createRepositories(env.DB);
  const profile = await repos.relevanceProfiles.getActive();
  if (!profile) {
    return;
  }

  const signal = normalizeSignal(input.signal);
  if (!signal) {
    return;
  }

  await repos.preferenceEvents.create({
    profileId: profile.id,
    eventType: input.eventType,
    targetType: input.targetType,
    targetId: input.targetId,
    signal,
    metadata: input.metadata
  });

  const memory = parsePreferenceMemory(profile.memory_json);
  memory[input.section] = addUnique(memory[input.section], signal);
  memory.updated_at = nowIso();
  await repos.relevanceProfiles.updateMemory(profile.id, memory);
}

function formatSection(title: string, items: string[]): string | null {
  if (items.length === 0) {
    return null;
  }

  return `${title}:\n${items.slice(0, maxMemoryItems).map((item) => `- ${item}`).join("\n")}`;
}

function addUnique(items: string[], next: string): string[] {
  const normalizedNext = comparable(next);
  const withoutDuplicate = items.filter((item) => comparable(item) !== normalizedNext);
  return [next, ...withoutDuplicate].slice(0, maxMemoryItems);
}

function normalizeSignal(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 240);
}

function comparable(value: string): string {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}
