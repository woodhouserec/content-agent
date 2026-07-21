import type { Env } from "../domain/runtime";
import { createRepositories } from "../storage/repositories";
import type { RelevanceProfileRecord } from "../storage/relevance-profiles";
import { parseProfileArray } from "../storage/relevance-profiles";

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

export async function buildActiveProfileSummary(env: Env): Promise<string> {
  const active = await getActiveRelevanceProfile(env);

  if (!active) {
    return buildProfileSummary();
  }

  return formatStoredProfile(active);
}

export function formatStoredProfile(profile: RelevanceProfileRecord): string {
  return [
    `Profile: ${profile.name}${profile.is_active ? " (active)" : ""}`,
    `Role: ${profile.role}`,
    `Focus: ${parseProfileArray(profile.focus_json).join(", ")}`,
    `Audience: ${parseProfileArray(profile.audience_json).join(", ")}`,
    `Tone: ${profile.tone}`,
    `Position: ${profile.position}`,
    `Min rule score for AI: ${profile.min_rule_score}`,
    `Min final score for topic: ${profile.min_final_score_for_topic}`
  ].join("\n");
}

export function profileFocusKeywords(profile: RelevanceProfileRecord | null): string[] {
  const base = relevanceProfile.focusAreas;
  const stored = profile ? parseProfileArray(profile.focus_json) : [];
  return [...new Set([...base, ...stored].map((value) => value.toLowerCase()))];
}
