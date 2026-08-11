export const draftConfig = {
  maxDraftGenerationsPerTopic: 6,
  maxRevisionsPerDraft: 5,
  maxSourceContextLength: 4200,
  maxGroundedSources: 3,
  maxSourceSummaryLength: 550,
  maxSourceExcerptLength: 750,
  defaultPostLength: "default",
  openAiTimeoutMs: 45_000,
  defaultOpenAiModel: "gpt-4.1-mini"
} as const;
