export const scoringConfig = {
  maxAiScoringItems: 10,
  maxItemTextLength: 4000,
  minRuleScoreForAi: 60,
  minFinalScoreForTopic: 70,
  maxTopicsPerRun: 10,
  topicLookbackDays: 30,
  scoringVersion: "rules_v1_ai_v1",
  defaultOpenAiModel: "gpt-4.1-mini",
  openAiTimeoutMs: 25_000
} as const;
