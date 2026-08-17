import type { Env } from "../domain/runtime";
import { createRepositories } from "../storage/repositories";
import type { RelevanceProfileRecord } from "../storage/relevance-profiles";
import { parsePreferenceMemory, parseProfileArray } from "../storage/relevance-profiles";

export const relevanceProfile = {
  profession: "UI/UX and Product Designer and Analyst, Startup Founder",
  focusAreas: [
    "Product Design",
    "UX Research",
    "Design Systems",
    "AI in Design",
    "Human-Computer Interaction",
    "Accessibility",
    "SaaS Product Design",
    "Product Strategy",
    "UX Metrics",
    "Design Operations",
    "Startups",
    "Foundraising"
  ],
  unwantedAreas: [
    "general news without a design angle",
    "jobs",
    "advertising posts",
    "shallow tool roundups",
    "crypto without product design relevance",
    "pure engineering without UX/Product angle"
  ],
  contentLanguage: "English",
  sourceLanguage: "Mostly English",
  audience: [
    "Product Designers",
    "UI/UX Designers",
    "Design Leads",
    "Product Managers",
    "Founders",
    "SaaS specialists",
    "HR's"
  ],
  expertiseLevel: "middle-to-senior",
  style: "professional, substantive, clear, not academically overloaded",
  maxNewsAgeDays: 7,
  evergreenAllowed: true,
  minRuleScoreForAi: 60,
  minFinalScoreForTopic: 70,
  geography: "international",
  tone: "thoughtful, confident, non-promotional",
  authorPosition: "practitioner insight, not news retelling",
  timezone: "Europe/Amsterdam"
} as const;

export interface PromptAuthorProfile {
  id: string;
  name: string;
  role: string;
  focusAreas: string[];
  unwantedAreas: string[];
  audience: string[];
  tone: string;
  position: string;
  languageForPost: string;
  reviewLanguage: string;
  minRuleScore: number;
  minFinalScoreForTopic: number;
}

export function buildProfileSummary(): string {
  return [
    `Role: ${relevanceProfile.profession}`,
    `Focus: ${relevanceProfile.focusAreas.join(", ")}`,
    `Audience: ${relevanceProfile.audience.join(", ")}`,
    `Tone: ${relevanceProfile.tone}`,
    `Position: ${relevanceProfile.authorPosition}`,
    `Min rule score for AI: ${relevanceProfile.minRuleScoreForAi}`,
    `Min final score for topic: ${relevanceProfile.minFinalScoreForTopic}`
  ].join("\n");
}

export async function getActiveRelevanceProfile(env: Env): Promise<RelevanceProfileRecord | null> {
  try {
    return createRepositories(env.DB).relevanceProfiles.getActive();
  } catch {
    return null;
  }
}

export async function getActivePromptAuthorProfile(env: Env): Promise<PromptAuthorProfile> {
  return storedProfileToPromptAuthorProfile(await getActiveRelevanceProfile(env));
}

export function storedProfileToPromptAuthorProfile(profile: RelevanceProfileRecord | null): PromptAuthorProfile {
  if (!profile) {
    return defaultPromptAuthorProfile();
  }

  return {
    id: profile.id,
    name: profile.name,
    role: profile.role,
    focusAreas: nonEmptyProfileArray(profile.focus_json, [...relevanceProfile.focusAreas]),
    unwantedAreas: [...relevanceProfile.unwantedAreas],
    audience: nonEmptyProfileArray(profile.audience_json, [...relevanceProfile.audience]),
    tone: profile.tone,
    position: profile.position,
    languageForPost: relevanceProfile.contentLanguage,
    reviewLanguage: "Russian",
    minRuleScore: profile.min_rule_score,
    minFinalScoreForTopic: profile.min_final_score_for_topic
  };
}

export function defaultPromptAuthorProfile(): PromptAuthorProfile {
  return {
    id: "profile_base",
    name: "Базовый",
    role: relevanceProfile.profession,
    focusAreas: [...relevanceProfile.focusAreas],
    unwantedAreas: [...relevanceProfile.unwantedAreas],
    audience: [...relevanceProfile.audience],
    tone: relevanceProfile.tone,
    position: relevanceProfile.authorPosition,
    languageForPost: relevanceProfile.contentLanguage,
    reviewLanguage: "Russian",
    minRuleScore: relevanceProfile.minRuleScoreForAi,
    minFinalScoreForTopic: relevanceProfile.minFinalScoreForTopic
  };
}

export async function buildActiveProfileSummary(env: Env): Promise<string> {
  const active = await getActiveRelevanceProfile(env);

  if (!active) {
    return buildProfileSummary();
  }

  return formatStoredProfile(active);
}

export function formatStoredProfile(profile: RelevanceProfileRecord): string {
  const memory = parsePreferenceMemory(profile.memory_json);
  return [
    `Profile: ${profile.name}${profile.is_active ? " (active)" : ""}`,
    `Role: ${profile.role}`,
    `Focus: ${parseProfileArray(profile.focus_json).join(", ")}`,
    `Audience: ${parseProfileArray(profile.audience_json).join(", ")}`,
    `Tone: ${profile.tone}`,
    `Position: ${profile.position}`,
    `Min rule score for AI: ${profile.min_rule_score}`,
    `Min final score for topic: ${profile.min_final_score_for_topic}`,
    "",
    "Preference memory:",
    formatMemoryLine("Writing", memory.writing_preferences),
    formatMemoryLine("Visual", memory.visual_preferences),
    formatMemoryLine("Topics", memory.topic_preferences),
    formatMemoryLine("Avoid", memory.avoid),
    `Updated: ${memory.updated_at ?? "not yet"}`
  ].join("\n");
}

export function profileFocusKeywords(profile: RelevanceProfileRecord | null): string[] {
  const focus = profile ? nonEmptyProfileArray(profile.focus_json, [...relevanceProfile.focusAreas]) : [...relevanceProfile.focusAreas];
  return [...new Set(focus.flatMap(expandFocusKeywords))];
}

function formatMemoryLine(label: string, items: string[]): string {
  return `${label}: ${items.length > 0 ? items.slice(0, 5).join("; ") : "empty"}`;
}

function nonEmptyProfileArray(value: string, fallback: string[]): string[] {
  const parsed = parseProfileArray(value).map((item) => item.trim()).filter(Boolean);
  return parsed.length > 0 ? parsed : fallback;
}

function expandFocusKeywords(value: string): string[] {
  const normalized = value.toLowerCase().replace(/\s+/g, " ").trim();
  const parts = normalized
    .split(/[^a-zа-яё0-9]+/i)
    .map((part) => part.trim())
    .filter((part) => part.length >= 4 && !profileKeywordStopWords.has(part));

  return [normalized, ...parts];
}

const profileKeywordStopWords = new Set([
  "and",
  "with",
  "from",
  "для",
  "или",
  "про",
  "как"
]);
