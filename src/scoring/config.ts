export const scoringConfig = {
  maxAiScoringItems: 10,
  maxItemTextLength: 1800,
  minRuleScoreForAi: 60,
  minFinalScoreForTopic: 70,
  maxTopicsPerRun: 5,
  topicLookbackDays: 30,
  scoringVersion: "rules_v1_ai_v1",
  defaultOpenAiModel: "gpt-4.1-mini"
} as const;
