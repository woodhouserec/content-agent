export const draftConfig = {
  maxDraftGenerationsPerTopic: 6,
  maxRevisionsPerDraft: 5,
  maxSourceContextLength: 6500,
  defaultPostLength: "default",
  openAiTimeoutMs: 25_000,
  defaultOpenAiModel: "gpt-4.1-mini"
} as const;

