import type { Env } from "../domain/runtime";
import { createRepositories } from "../storage/repositories";
import type { CollectedItemMode } from "../storage/collected-items";
import { logger } from "../utils/logger";
import { scoringConfig } from "./config";
import { createMaterialFreshnessFilter } from "./material-filter";
import type { AiScoringResult } from "./openai";
import { scoreWithOpenAi } from "./openai";
import { scoreCollectedItem } from "./rule-based";
import { getMaxTopicsPerRun } from "./thesis-filter";
import { formTopics } from "./topic-formation";

export interface ScoringRunResult {
  scoredItems: number;
  topicCandidateItems: number;
  aiRequests: number;
  usedAiFallback: boolean;
  topicsCreated: number;
  topicsSkippedAsDuplicates: number;
  topicsRestored: number;
  topicIds: string[];
}

export async function runScoring(env: Env, options: { mode?: CollectedItemMode } = {}): Promise<ScoringRunResult> {
  const repos = createRepositories(env.DB);
  const activeProfile = await repos.relevanceProfiles.getActive();
  const materialFilters = options.mode === "permanent"
    ? { freshnessSince: createMaterialFreshnessFilter(activeProfile).sinceIso }
    : {};
  const candidates = await loadScoringCandidates(env, options.mode, materialFilters);
  const scoredItems = [];

  for (const item of candidates) {
    const rule = scoreCollectedItem(item, activeProfile);

    await repos.collectedItems.updateScoring({
      id: item.id,
      ruleScore: rule.score,
      aiScore: null,
      finalScore: rule.score,
      scoringBreakdown: {
        rule,
        ai: null,
        aiFallback: true
      },
      scoringVersion: scoringConfig.scoringVersion
    });

    scoredItems.push({
      ...item,
      rule_score: rule.score,
      final_score: rule.score,
      scoring_breakdown_json: JSON.stringify({ rule })
    });
  }

  const shortlist = scoredItems
    .filter((item) => (item.rule_score ?? 0) >= (activeProfile?.min_rule_score ?? scoringConfig.minRuleScoreForAi))
    .sort((a, b) => (b.rule_score ?? 0) - (a.rule_score ?? 0))
    .slice(0, scoringConfig.maxAiScoringItems);

  let aiRequests = 0;
  let usedAiFallback = true;
  let aiResults: AiScoringResult[] = [];

  try {
    const ai = await scoreWithOpenAi(env, shortlist, { profile: activeProfile });
    aiResults = ai.results;
    usedAiFallback = ai.usedFallback;
    aiRequests = ai.requestCount;

    for (const result of ai.results) {
      const item = scoredItems.find((candidate) => candidate.id === result.itemId);

      if (!item) {
        continue;
      }

      const finalScore = Math.round(((item.rule_score ?? 0) * 0.55) + (result.aiRelevanceScore * 0.3) + (result.professionalValue * 0.15));
      item.ai_score = result.aiRelevanceScore;
      item.final_score = finalScore;

      await repos.collectedItems.updateScoring({
        id: item.id,
        ruleScore: item.rule_score ?? 0,
        aiScore: result.aiRelevanceScore,
        finalScore,
        scoringBreakdown: {
          rule: item.scoring_breakdown_json ? JSON.parse(item.scoring_breakdown_json).rule : null,
          ai: result,
          aiFallback: false
        },
        scoringVersion: scoringConfig.scoringVersion
      });
    }
  } catch (error: unknown) {
    usedAiFallback = true;
    logger.warn("OpenAI scoring fallback used", {
      event: "openai_scoring_fallback",
      error: error instanceof Error ? error.message : String(error)
    });
  }

  const topicItems = scoredItems.length > 0
    ? scoredItems
    : await repos.collectedItems.listTopicCandidates(100, options.mode, materialFilters);

  const topics = await formTopics(topicItems, aiResults, {
    minFinalScoreForTopic: activeProfile?.min_final_score_for_topic,
    maxTopicsPerRun: getMaxTopicsPerRun(activeProfile)
  });
  let topicsCreated = 0;
  let topicsSkippedAsDuplicates = 0;
  let topicsRestored = 0;
  const topicIds: string[] = [];

  for (const topic of topics) {
    const result = await repos.topics.createIfNotExists({
      title: topic.title,
      titleRu: topic.titleRu,
      summary: topic.summary,
      summaryRu: topic.summaryRu,
      whyItMatters: topic.whyItMatters,
      whyItMattersRu: topic.whyItMattersRu,
      suggestedAngle: topic.suggestedAngle,
      suggestedAngleRu: topic.suggestedAngleRu,
      targetAudience: topic.targetAudience,
      sourceItemIds: topic.sourceItemIds,
      relevanceScore: topic.combinedScore,
      noveltyScore: topic.noveltyScore,
      topicFingerprint: topic.fingerprint,
      aiReasoningSummary: topic.aiReasoningSummary
    });

    if (result.inserted) {
      topicsCreated += 1;
      topicIds.push(result.id);
    } else {
      topicsSkippedAsDuplicates += 1;

      if (options.mode && result.status !== "candidate" && result.status !== "sent" && result.status !== "selected") {
        await repos.topics.resetToCandidate(result.id);
        topicsRestored += 1;
        topicIds.push(result.id);
      } else if (result.status === "candidate" || result.status === "sent") {
        topicIds.push(result.id);
      }
    }
  }

  return {
    scoredItems: scoredItems.length,
    topicCandidateItems: topicItems.length,
    aiRequests,
    usedAiFallback,
    topicsCreated,
    topicsSkippedAsDuplicates,
    topicsRestored,
    topicIds
  };
}

async function loadScoringCandidates(
  env: Env,
  mode?: CollectedItemMode,
  filters: { freshnessSince?: string } = {}
) {
  const repos = createRepositories(env.DB);
  const candidates = await repos.collectedItems.listForScoring(100, mode, filters);

  if (candidates.length > 0 || mode !== "permanent") {
    return candidates;
  }

  const latestRun = await repos.processingRuns.latest();
  if (!latestRun || latestRun.status !== "completed" || latestRun.received_items_count <= 0) {
    return candidates;
  }

  return repos.collectedItems.listRecentlySeen(100, mode, latestRun.started_at, filters);
}
