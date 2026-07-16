import type { Env } from "../domain/runtime";
import { createRepositories } from "../storage/repositories";
import { logger } from "../utils/logger";
import { scoringConfig } from "./config";
import { scoreWithOpenAi } from "./openai";
import { scoreCollectedItem } from "./rule-based";
import { formTopics } from "./topic-formation";

export interface ScoringRunResult {
  scoredItems: number;
  aiRequests: number;
  usedAiFallback: boolean;
  topicsCreated: number;
  topicsSkippedAsDuplicates: number;
}

export async function runScoring(env: Env): Promise<ScoringRunResult> {
  const repos = createRepositories(env.DB);
  const candidates = await repos.collectedItems.listForScoring(100);
  const scoredItems = [];

  for (const item of candidates) {
    const rule = scoreCollectedItem(item);

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
    .filter((item) => (item.rule_score ?? 0) >= scoringConfig.minRuleScoreForAi)
    .sort((a, b) => (b.rule_score ?? 0) - (a.rule_score ?? 0))
    .slice(0, scoringConfig.maxAiScoringItems);

  let aiRequests = 0;
  let usedAiFallback = true;
  let aiResults: AiScoringResult[] = [];

  try {
    const ai = await scoreWithOpenAi(env, shortlist);
    aiResults = ai.results;
    usedAiFallback = ai.usedFallback;
    aiRequests = ai.usedFallback || shortlist.length === 0 ? 0 : 1;

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

  const topics = await formTopics(scoredItems, aiResults);
  let topicsCreated = 0;
  let topicsSkippedAsDuplicates = 0;

  for (const topic of topics) {
    const result = await repos.topics.createIfNotExists({
      title: topic.title,
      summary: topic.summary,
      whyItMatters: topic.whyItMatters,
      suggestedAngle: topic.suggestedAngle,
      targetAudience: topic.targetAudience,
      sourceItemIds: topic.sourceItemIds,
      relevanceScore: topic.combinedScore,
      noveltyScore: topic.noveltyScore,
      topicFingerprint: topic.fingerprint,
      aiReasoningSummary: topic.aiReasoningSummary
    });

    if (result.inserted) {
      topicsCreated += 1;
    } else {
      topicsSkippedAsDuplicates += 1;
    }
  }

  return {
    scoredItems: scoredItems.length,
    aiRequests,
    usedAiFallback,
    topicsCreated,
    topicsSkippedAsDuplicates
  };
}
import type { AiScoringResult } from "./openai";
