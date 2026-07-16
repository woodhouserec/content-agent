import type { CollectedItemRecord } from "../storage/collected-items";
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

export function scoreCollectedItem(item: CollectedItemRecord): RuleScoreBreakdown {
  const text = [
    item.title,
    item.summary,
    item.normalized_content,
    item.metadata_json
  ].filter(Boolean).join(" ").toLowerCase();

  const factors: Record<string, number> = {};
  const boosts: string[] = [];
  const penalties: string[] = [];

  const matchedFocus = focusKeywords.filter((keyword) => text.includes(keyword));
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
