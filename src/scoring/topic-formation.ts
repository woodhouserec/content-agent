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
    keywords: ["ai", "artificial intelligence", "automation", "llm", "agent", "agentic", "generative", "prompt"],
    title: "Where AI can support product design work without replacing product judgment",
    angle: "Use the sources to separate useful AI assistance from the human responsibility for framing, tradeoffs, and product outcomes.",
    whyItMatters: "AI is becoming part of everyday design work, but teams still need clear judgment about what should be automated and what must remain a product decision."
  },
  {
    key: "ai_interaction",
    keywords: ["ai ui", "ai-generated", "agentic tool", "chat interface", "assistant", "human-ai", "canvas", "workflow"],
    title: "Why AI products need interaction design, not just better model output",
    angle: "Frame AI as an interaction problem: trust, control, feedback, and error recovery matter as much as raw capability.",
    whyItMatters: "As AI becomes a product surface, UX quality depends on how well people can understand, steer, and recover from system behavior."
  },
  {
    key: "design_systems_governance",
    keywords: ["design system", "component", "tokens", "variables", "governance", "library", "figma", "pattern"],
    title: "Why design systems now need governance as much as components",
    angle: "Discuss how design systems affect consistency, accessibility, product velocity, and decision-making across teams.",
    whyItMatters: "Design systems create value only when they shape real product decisions, not when they become a disconnected UI inventory."
  },
  {
    key: "ux_research_outcomes",
    keywords: ["research", "usability", "user research", "interview", "insight", "study", "survey", "testing", "outcome"],
    title: "Why stronger UX research is less about more data and more about better product decisions",
    angle: "Frame research as a decision-quality practice for teams, not a ritual or report factory.",
    whyItMatters: "Research becomes more valuable when it changes product direction, prioritization, and risk management."
  },
  {
    key: "ux_metrics",
    keywords: ["metric", "outcome", "benchmark", "measurement", "analytics", "conversion", "retention", "task completion", "sus", "nps"],
    title: "How designers can report product outcomes instead of design activity",
    angle: "Connect UX metrics to business decisions without reducing design quality to vanity numbers.",
    whyItMatters: "Design teams earn more influence when they can explain how their work affects risk, revenue, speed, retention, or customer effort."
  },
  {
    key: "accessibility",
    keywords: ["accessibility", "inclusive", "wcag", "a11y", "assistive", "semantic", "keyboard", "screen reader"],
    title: "Why accessibility should be treated as product quality, not a late-stage checklist",
    angle: "Connect accessibility to usability, market reach, risk reduction, and product craft.",
    whyItMatters: "Accessibility decisions shape whether a product works for real people in real conditions, not only whether it passes a compliance review."
  },
  {
    key: "forms_usability",
    keywords: ["form", "forms", "input", "checkout", "signup", "onboarding", "field", "validation", "friction"],
    title: "Why small form decisions can create outsized product friction",
    angle: "Use the source as a practical reflection on how UI details affect completion, trust, and customer effort.",
    whyItMatters: "Forms are often where product intent meets user patience, so small interaction choices can directly affect conversion and satisfaction."
  },
  {
    key: "product_discovery",
    keywords: ["discovery", "prototype", "experiment", "problem", "opportunity", "validation", "hypothesis", "customer evidence"],
    title: "Why product discovery should protect teams from building polished guesses",
    angle: "Show how designers can use evidence, prototypes, and constraints to improve product bets before execution.",
    whyItMatters: "Discovery work matters when it reduces uncertainty and helps teams choose what not to build."
  },
  {
    key: "product_strategy_saas",
    keywords: ["strategy", "saas", "pricing", "monetization", "roadmap", "positioning", "b2b", "enterprise", "growth"],
    title: "How product designers can bring stronger strategic judgment into SaaS decisions",
    angle: "Show how designers can connect user evidence, business constraints, and product direction.",
    whyItMatters: "SaaS teams need designers who can reason about customer value, business model, and long-term product quality together."
  },
  {
    key: "startup_founder",
    keywords: ["startup", "founder", "fundraising", "seed", "venture", "vc", "early stage", "go-to-market"],
    title: "What startup builders can learn when product, design, and go-to-market signals collide",
    angle: "Turn startup material into a practitioner insight about focus, learning speed, and product responsibility.",
    whyItMatters: "Early teams often make design decisions under pressure, so the best content connects craft with market learning and execution."
  },
  {
    key: "design_operations",
    keywords: ["design ops", "design operations", "process", "team", "handoff", "collaboration", "workflow", "leadership", "stakeholder"],
    title: "Why design operations should make better decisions easier, not add more process",
    angle: "Discuss process as an enabler of clarity, collaboration, and accountability rather than bureaucracy.",
    whyItMatters: "Design process is useful when it improves the quality and speed of decisions across product teams."
  },
  {
    key: "product_strategy",
    keywords: ["product", "customer", "market", "decision", "value", "growth", "strategy"],
    title: "Why product design needs a clearer point of view on customer value",
    angle: "Use the sources to explain how designers can contribute beyond interface execution.",
    whyItMatters: "Product designers become more valuable when they can connect interface choices to customer problems, team constraints, and business outcomes."
  }
];

export async function formTopics(
  items: CollectedItemRecord[],
  aiResults: AiScoringResult[],
  options: { minFinalScoreForTopic?: number } = {}
): Promise<Array<TopicCandidate & { fingerprint: string }>> {
  const aiByItemId = new Map(aiResults.map((result) => [result.itemId, result]));
  const eligible = items
    .filter((item) => (item.final_score ?? 0) >= (options.minFinalScoreForTopic ?? scoringConfig.minFinalScoreForTopic))
    .sort((a, b) => (b.final_score ?? 0) - (a.final_score ?? 0));
  const groups = new Map<string, CollectedItemRecord[]>();

  for (const item of eligible) {
    const key = classifyItem(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  const candidates: Array<TopicCandidate & { fingerprint: string }> = [];

  for (const [key, group] of groups) {
    const template = topicMap.find((topic) => topic.key === key) ?? topicMap[topicMap.length - 1];
    const topItems = group.slice(0, 3);
    const ai = topItems.map((item) => aiByItemId.get(item.id)).find(Boolean);
    const sourceItemIds = topItems.map((item) => item.id);
    const combinedScore = Math.round(topItems.reduce((sum, item) => sum + (item.final_score ?? 0), 0) / topItems.length);
    const noveltyScore = Math.round(topItems.reduce((sum, item) => sum + (extractNovelty(item, aiByItemId.get(item.id)) ?? 65), 0) / topItems.length);
    const title = ai?.possibleLinkedInAngle && isSpecificAiAngle(ai.possibleLinkedInAngle)
      ? ai.possibleLinkedInAngle
      : template.title;
    const suggestedAngle = template.angle;
    const fingerprint = await createTopicFingerprint(title, suggestedAngle, sourceItemIds);

    candidates.push({
      title,
      summary: summarizeGroup(topItems),
      whyItMatters: template.whyItMatters,
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

export function classifyItem(item: CollectedItemRecord): string {
  const text = `${item.title} ${item.summary ?? ""} ${item.normalized_content ?? ""}`.toLowerCase();
  let best = { key: "product_strategy", score: 0 };

  for (const topic of topicMap) {
    const score = topic.keywords.reduce((sum, keyword) => sum + (text.includes(keyword) ? keywordWeight(keyword) : 0), 0);
    if (score > best.score) {
      best = { key: topic.key, score };
    }
  }

  return best.key;
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

function keywordWeight(keyword: string): number {
  return keyword.includes(" ") ? 3 : 1;
}

function isSpecificAiAngle(angle: string): boolean {
  const normalized = angle.toLowerCase();
  if (normalized.includes("how ai is changing product design work without replacing product responsibility")) {
    return false;
  }

  return angle.length > 32 && angle.length < 180;
}
