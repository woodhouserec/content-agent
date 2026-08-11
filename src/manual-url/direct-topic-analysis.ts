import { OpenAiDraftClient } from "../drafts/openai-draft-client";
import type { OpenAiJsonResult } from "../drafts/types";
import type { Env } from "../domain/runtime";
import { formatPreferenceMemoryForPrompt, getActivePreferenceMemory } from "../preferences/memory";
import type { CollectedItemRecord } from "../storage/collected-items";
import { createRepositories } from "../storage/repositories";

export interface DirectTopicAnalysis {
  title: string;
  titleRu: string;
  whyItMatters: string;
  whyItMattersRu: string;
  suggestedAngle: string;
  suggestedAngleRu: string;
  summary: string;
  summaryRu: string;
  targetAudience: string;
  noveltyScore: number;
  relevanceScore: number;
  reasoningSummary: string;
  usedAi: boolean;
}

export async function analyzeManualUrlForDirectTopic(env: Env, item: CollectedItemRecord): Promise<DirectTopicAnalysis> {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured for direct manual URL analysis.");
  }

  const client = new OpenAiDraftClient(env);
  const started = Date.now();

  try {
    const result = await client.createJson<Record<string, unknown>>({
      requestType: "manual_url_direct_topic",
      promptVersion: "manual_url_direct_topic_v1",
      systemPrompt: directTopicPrompt,
      timeoutMs: 30_000,
      payload: {
        source: {
          id: item.id,
          title: item.title,
          author: item.author,
          published_at: item.published_at,
          canonical_url: item.canonical_url ?? item.url,
          summary: item.summary,
          excerpt: trimForAi(item.normalized_content ?? item.raw_content ?? item.summary ?? ""),
          important_quotes: metadataArray(item.metadata_json, "quotes", 5),
          context_links: metadataArray(item.metadata_json, "links", 8),
          extraction_status: extractionStatus(item.metadata_json)
        },
        author_context: {
          role: "UI/UX and Product Designer and Analyst, Startup Founder",
          audience: ["Product Designers", "UI/UX Designers", "Design Leads", "Product Managers", "SaaS founders"],
          language_for_post: "English",
          review_language: "Russian",
          position: "practitioner insight, not a news retelling"
        },
        preference_memory: formatPreferenceMemoryForPrompt(await getActivePreferenceMemory(env))
      }
    });
    await logDirectTopicCall(env, result, "completed", Date.now() - started);
    return validateDirectTopicAnalysis(result.data);
  } catch (error: unknown) {
    await createRepositories(env.DB).aiGenerationLogs.create({
      provider: "openai",
      model: env.OPENAI_DRAFT_MODEL ?? "unknown",
      promptVersion: "manual_url_direct_topic_v1",
      requestType: "manual_url_direct_topic",
      latencyMs: Date.now() - started,
      status: "failed",
      errorType: error instanceof Error ? error.message.slice(0, 180) : "unknown"
    });
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`AI-анализ материала не завершился: ${message}`);
  }
}

const directTopicPrompt = `Analyze one manually submitted source and create a specific LinkedIn post direction.
This is NOT general topic clustering. The user explicitly wants a post based on this exact source.
Use only the provided source. Do not invent facts, examples, numbers, or author claims.
Create a distinctive Product/UX practitioner angle that uses concrete context from the source.
Avoid generic angles like "a Product/UX perspective on this article".
Avoid clickbait and promotional tone.
The final LinkedIn post will be in English, but Telegram review fields should also have Russian versions.
Return strict JSON with:
title, title_ru, why_it_matters, why_it_matters_ru, suggested_angle, suggested_angle_ru, summary, summary_ru, target_audience, novelty_score, relevance_score, reasoning_summary.`;

export function validateDirectTopicAnalysis(value: unknown): DirectTopicAnalysis {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid direct topic analysis JSON response");
  }
  const record = value as Record<string, unknown>;

  return {
    title: text(record.title, "title", 12, 180),
    titleRu: text(record.title_ru, "title_ru", 8, 220),
    whyItMatters: text(record.why_it_matters, "why_it_matters", 20, 900),
    whyItMattersRu: text(record.why_it_matters_ru, "why_it_matters_ru", 20, 900),
    suggestedAngle: text(record.suggested_angle, "suggested_angle", 20, 900),
    suggestedAngleRu: text(record.suggested_angle_ru, "suggested_angle_ru", 20, 900),
    summary: text(record.summary, "summary", 20, 700),
    summaryRu: text(record.summary_ru, "summary_ru", 20, 700),
    targetAudience: text(record.target_audience, "target_audience", 3, 300),
    noveltyScore: score(record.novelty_score, "novelty_score"),
    relevanceScore: score(record.relevance_score, "relevance_score"),
    reasoningSummary: text(record.reasoning_summary, "reasoning_summary", 10, 700),
    usedAi: true
  };
}

async function logDirectTopicCall(
  env: Env,
  result: OpenAiJsonResult<Record<string, unknown>>,
  status: "completed",
  latencyMs: number
): Promise<void> {
  await createRepositories(env.DB).aiGenerationLogs.create({
    provider: "openai",
    model: result.model,
    promptVersion: "manual_url_direct_topic_v1",
    requestType: "manual_url_direct_topic",
    tokenUsage: result.usage,
    latencyMs,
    status
  });
}

function text(value: unknown, field: string, minLength: number, maxLength: number): string {
  if (typeof value !== "string" || value.trim().length < minLength) {
    throw new Error(`Invalid ${field} in direct topic response`);
  }

  return value.trim().slice(0, maxLength);
}

function score(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Invalid ${field} in direct topic response`);
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function trimForAi(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 6000);
}

function extractionStatus(metadataJson: string | null): string | null {
  if (!metadataJson) {
    return null;
  }

  try {
    const metadata = JSON.parse(metadataJson) as { extraction_status?: unknown };
    return typeof metadata.extraction_status === "string" ? metadata.extraction_status : null;
  } catch {
    return null;
  }
}

function metadataArray(metadataJson: string | null, key: "quotes" | "links", limit: number): unknown[] {
  if (!metadataJson) {
    return [];
  }

  try {
    const metadata = JSON.parse(metadataJson) as Record<string, unknown>;
    return Array.isArray(metadata[key]) ? metadata[key].slice(0, limit) : [];
  } catch {
    return [];
  }
}
