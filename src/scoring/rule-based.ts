import type { CollectedItemRecord } from "../storage/collected-items";
import type { RelevanceProfileRecord } from "../storage/relevance-profiles";
import { profileFocusKeywords } from "./relevance-profile";
import { scoringConfig } from "./config";

export interface RuleScoreBreakdown {
  version: string;
  score: number;
  factors: Record<string, number>;
  boosts: string[];
  penalties: string[];
}

const focusKeywords = [
  "product design", "ux", "user experience", "research", "design system", "accessibility",
  "hci", "human-computer interaction", "saas", "product strategy", "metrics", "design ops",
  "startup", "founder", "ai", "artificial intelligence", "figma", "prototype", "usability"
];

const unwantedKeywords = [
  "hiring", "job opening", "we are hiring", "sponsored", "advertisement", "crypto", "blockchain",
  "top tools", "best tools", "coupon", "sale"
];

export function scoreCollectedItem(item: CollectedItemRecord, profile: RelevanceProfileRecord | null = null): RuleScoreBreakdown {
  const text = [
    item.title,
    item.summary,
    item.normalized_content,
    item.metadata_json
  ].filter(Boolean).join(" ").toLowerCase();

  const factors: Record<string, number> = {};
  const boosts: string[] = [];
  const penalties: string[] = [];

  const activeFocusKeywords = [...new Set([...focusKeywords, ...profileFocusKeywords(profile)])];
  const matchedFocus = activeFocusKeywords.filter((keyword) => text.includes(keyword));
  factors.topicMatch = Math.min(35, matchedFocus.length * 7);
  if (matchedFocus.length > 0) {
    boosts.push(`Matched focus areas: ${matchedFocus.slice(0, 5).join(", ")}`);
  }

  const freshness = freshnessScore(item.published_at);
  factors.freshness = freshness;
  if (freshness >= 15) {
    boosts.push("Fresh material");
  }

  factors.sourceQuality = sourceQualityScore(item.source_id);
  const sourceConfig = readSourceConfig(item.metadata_json);
  factors.sourceMetadata = sourceMetadataScore(sourceConfig);
  if (factors.sourceMetadata > 0) {
    boosts.push(`Source metadata: tier=${sourceConfig.source_tier ?? "unknown"}, trust=${sourceConfig.trust_score ?? "n/a"}, priority=${sourceConfig.editorial_priority ?? "n/a"}`);
  }
  if (factors.sourceQuality >= 15) {
    boosts.push("High-quality professional source");
  }

  factors.summaryQuality = summaryQualityScore(item);
  if (factors.summaryQuality >= 10) {
    boosts.push("Has substantive summary/content");
  }

  factors.engagement = engagementScore(item.metadata_json);
  if (factors.engagement > 0) {
    boosts.push("Has engagement metadata");
  }

  const spamSignals = unwantedKeywords.filter((keyword) => text.includes(keyword));
  factors.penalty = 0;
  if (spamSignals.length > 0) {
    factors.penalty -= Math.min(30, spamSignals.length * 12);
    penalties.push(`Unwanted signals: ${spamSignals.join(", ")}`);
  }

  if (text.length < 160) {
    factors.penalty -= 15;
    penalties.push("Content is too short");
  }

  if (sourceConfig.max_content_age_days && item.published_at) {
    const ageDays = (Date.now() - new Date(item.published_at).getTime()) / 86_400_000;

    if (!Number.isNaN(ageDays) && ageDays > sourceConfig.max_content_age_days) {
      factors.penalty -= 10;
      penalties.push(`Older than source max_content_age_days (${sourceConfig.max_content_age_days})`);
    }
  }

  const score = clamp(Object.values(factors).reduce((sum, value) => sum + value, 20), 0, 100);

  return {
    version: scoringConfig.scoringVersion,
    score,
    factors,
    boosts,
    penalties
  };
}

function freshnessScore(publishedAt: string | null): number {
  if (!publishedAt) {
    return 8;
  }

  const ageMs = Date.now() - new Date(publishedAt).getTime();
  const ageDays = ageMs / 86_400_000;

  if (Number.isNaN(ageDays)) {
    return 8;
  }

  if (ageDays <= 7) {
    return 20;
  }

  if (ageDays <= 30) {
    return 12;
  }

  return 6;
}

function sourceQualityScore(sourceId: string): number {
  if (sourceId.includes("nngroup")) return 20;
  if (sourceId.includes("smashing")) return 16;
  if (sourceId.includes("intercom")) return 16;
  if (sourceId.includes("product_talk")) return 18;
  if (sourceId.includes("a_list_apart")) return 14;
  return 10;
}

interface ScoringSourceConfig {
  source_tier?: "primary" | "professional" | "community" | "discovery";
  content_kind?: string;
  trust_score?: number;
  editorial_priority?: number;
  max_content_age_days?: number;
  topic_tags?: string[];
}

function readSourceConfig(metadataJson: string | null): ScoringSourceConfig {
  if (!metadataJson) {
    return {};
  }

  try {
    const metadata = JSON.parse(metadataJson) as { sourceConfig?: ScoringSourceConfig };
    return metadata.sourceConfig ?? {};
  } catch {
    return {};
  }
}

function sourceMetadataScore(config: ScoringSourceConfig): number {
  let score = 0;

  if (config.source_tier === "primary") score += 8;
  if (config.source_tier === "professional") score += 6;
  if (config.source_tier === "community") score += 3;
  if (config.source_tier === "discovery") score += 1;

  if (typeof config.trust_score === "number") {
    score += Math.round(Math.max(0, Math.min(100, config.trust_score)) / 20);
  }

  if (typeof config.editorial_priority === "number") {
    score += Math.max(0, Math.min(5, config.editorial_priority));
  }

  if (config.content_kind === "original_research") score += 5;
  if (config.content_kind === "author_essay") score += 4;
  if (config.content_kind === "case_study") score += 4;
  if (config.content_kind === "community_discussion") score += 1;
  if (config.content_kind === "news") score += 0;

  return Math.min(18, score);
}

function summaryQualityScore(item: CollectedItemRecord): number {
  const length = `${item.summary ?? ""} ${item.normalized_content ?? ""}`.trim().length;
  if (length >= 600) return 15;
  if (length >= 250) return 10;
  if (length >= 80) return 5;
  return -10;
}

function engagementScore(metadataJson: string | null): number {
  if (!metadataJson) {
    return 0;
  }

  try {
    const metadata = JSON.parse(metadataJson) as { score?: number; commentsCount?: number };
    const score = typeof metadata.score === "number" ? metadata.score : 0;
    const comments = typeof metadata.commentsCount === "number" ? metadata.commentsCount : 0;
    return Math.min(10, Math.floor(score / 50) + Math.floor(comments / 10));
  } catch {
    return 0;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}
