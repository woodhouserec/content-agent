import type { AiScoringResult } from "./openai";
import type { CollectedItemRecord } from "../storage/collected-items";
import { scoringConfig } from "./config";
import { createTopicFingerprint } from "./topic-fingerprint";

export interface TopicCandidate {
  title: string;
  summary: string;
  whyItMatters: string;
  suggestedAngle: string;
  targetAudience: string;
  sourceItemIds: string[];
  combinedScore: number;
  noveltyScore: number;
  aiReasoningSummary: string | null;
}

const topicMap = [
  {
    key: "ai_design",
    keywords: ["ai", "artificial intelligence", "automation", "llm"],
    title: "How AI is changing product design work without replacing product responsibility",
    angle: "Use the news as a practitioner reflection on where AI helps designers and where judgment, framing, and accountability still matter."
  },
  {
    key: "design_systems",
    keywords: ["design system", "component", "tokens", "figma"],
    title: "Why mature design systems are becoming product infrastructure, not just UI libraries",
    angle: "Discuss how design systems affect product velocity, consistency, accessibility, and decision-making."
  },
  {
    key: "ux_research",
    keywords: ["research", "usability", "user", "insight", "interview"],
    title: "Why stronger UX research is less about more data and more about better product decisions",
    angle: "Frame research as a decision-quality practice for teams, not a ritual or report factory."
  },
  {
    key: "accessibility",
    keywords: ["accessibility", "inclusive", "wcag", "a11y"],
    title: "Why accessibility should be treated as product quality, not a late-stage checklist",
    angle: "Connect accessibility to usability, market reach, and product craft."
  },
  {
    key: "product_strategy",
    keywords: ["strategy", "saas", "startup", "founder", "metric", "growth"],
    title: "How product designers can bring stronger strategic judgment into SaaS decisions",
    angle: "Show how designers can connect user evidence, business constraints, and product direction."
  }
];

export async function formTopics(items: CollectedItemRecord[], aiResults: AiScoringResult[]): Promise<Array<TopicCandidate & { fingerprint: string }>> {
  const aiByItemId = new Map(aiResults.map((result) => [result.itemId, result]));
  const eligible = items
    .filter((item) => (item.final_score ?? 0) >= scoringConfig.minFinalScoreForTopic)
    .sort((a, b) => (b.final_score ?? 0) - (a.final_score ?? 0));
  const groups = new Map<string, CollectedItemRecord[]>();

  for (const item of eligible) {
    const key = classifyItem(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  const candidates: Array<TopicCandidate & { fingerprint: string }> = [];

  for (const [key, group] of groups) {
    const template = topicMap.find((topic) => topic.key === key) ?? topicMap[4];
    const topItems = group.slice(0, 3);
    const ai = topItems.map((item) => aiByItemId.get(item.id)).find(Boolean);
    const sourceItemIds = topItems.map((item) => item.id);
    const combinedScore = Math.round(topItems.reduce((sum, item) => sum + (item.final_score ?? 0), 0) / topItems.length);
    const noveltyScore = Math.round(topItems.reduce((sum, item) => sum + (extractNovelty(item, aiByItemId.get(item.id)) ?? 65), 0) / topItems.length);
    const title = ai?.possibleLinkedInAngle && ai.possibleLinkedInAngle.length > 24
      ? ai.possibleLinkedInAngle
      : template.title;
    const suggestedAngle = template.angle;
    const fingerprint = await createTopicFingerprint(title, suggestedAngle, sourceItemIds);

    candidates.push({
      title,
      summary: summarizeGroup(topItems),
      whyItMatters: "This gives a Product/UX audience a concrete way to connect current industry signals with better design decisions.",
      suggestedAngle,
      targetAudience: "Product Designers, Design Leads, Product Managers, Founders, SaaS teams",
      sourceItemIds,
      combinedScore,
      noveltyScore,
      aiReasoningSummary: ai?.explanation ?? null,
      fingerprint
    });
  }

  return candidates
    .sort((a, b) => b.combinedScore - a.combinedScore)
    .slice(0, scoringConfig.maxTopicsPerRun);
}

function classifyItem(item: CollectedItemRecord): string {
  const text = `${item.title} ${item.summary ?? ""} ${item.normalized_content ?? ""}`.toLowerCase();
  return topicMap.find((topic) => topic.keywords.some((keyword) => text.includes(keyword)))?.key ?? "product_strategy";
}

function summarizeGroup(items: CollectedItemRecord[]): string {
  const titles = items.map((item) => item.title).slice(0, 3);
  return `Based on ${titles.length} recent source item${titles.length === 1 ? "" : "s"}: ${titles.join("; ")}.`;
}

function extractNovelty(item: CollectedItemRecord, ai: AiScoringResult | undefined): number | null {
  if (ai) {
    return ai.noveltyScore;
  }

  const breakdown = item.scoring_breakdown_json ? JSON.parse(item.scoring_breakdown_json) as { factors?: { freshness?: number } } : null;
  const freshness = breakdown?.factors?.freshness ?? 10;
  return Math.max(40, Math.min(80, 50 + freshness));
}
