export interface GroundedSource {
  id: string;
  title: string;
  author: string | null;
  publishedAt: string | null;
  canonicalUrl: string;
  summary: string | null;
  excerpt: string;
  extractionStatus: string | null;
}

export interface DraftBriefData {
  centralThesis: string;
  authorPosition: string;
  supportingPoints: string[];
  sourceFacts: string[];
  practicalTakeaway: string;
  targetAudience: string;
  desiredLength: string;
  tone: string;
  factualConstraints: string[];
}

export interface FactualReviewData {
  hasSeriousConflict: boolean;
  flags: string[];
  summary: string;
}

export interface DraftGenerationResult {
  content: string;
}

export interface OpenAiUsage {
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
}

export interface OpenAiJsonResult<T> {
  data: T;
  model: string;
  usage: OpenAiUsage | null;
  latencyMs: number;
}

export type DraftRevisionType = "rewrite" | "shorten" | "expand" | "opening" | "tone" | "custom";

