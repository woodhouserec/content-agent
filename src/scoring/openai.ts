import type { Env } from "../domain/runtime";
import type { CollectedItemRecord } from "../storage/collected-items";
import type { RelevanceProfileRecord } from "../storage/relevance-profiles";
import { scoringConfig } from "./config";
import { buildScoringPrompt } from "./prompts";
import { storedProfileToPromptAuthorProfile } from "./relevance-profile";

export interface AiScoringResult {
  itemId: string;
  aiRelevanceScore: number;
  noveltyScore: number;
  professionalValue: number;
  possibleLinkedInAngle: string;
  suggestedAngle: string;
  explanation: string;
  keyThesis: string;
  keyThesisRu: string;
  postTitle: string;
  postTitleRu: string;
  shortDescription: string;
  shortDescriptionRu: string;
  audienceValue: string;
  audienceValueRu: string;
  hrValue?: string;
  hrValueRu?: string;
  recruiterValue: string;
  recruiterValueRu: string;
  suggestedAngleRu: string;
}

export interface AiScoringResponse {
  results: AiScoringResult[];
  model: string | null;
  usedFallback: boolean;
  requestCount: number;
}

export async function scoreWithOpenAi(env: Env, items: CollectedItemRecord[], options: { timeoutMs?: number; profile?: RelevanceProfileRecord | null } = {}): Promise<AiScoringResponse> {
  if (!env.OPENAI_API_KEY || items.length === 0) {
    return {
      results: [],
      model: null,
      usedFallback: true,
      requestCount: 0
    };
  }

  const model = env.OPENAI_SCORING_MODEL ?? scoringConfig.defaultOpenAiModel;
  const authorProfile = storedProfileToPromptAuthorProfile(options.profile ?? null);

  const settled = await Promise.all(items.map(async (item) => scoreSingleItemWithOpenAi(env, model, authorProfile, item, options.timeoutMs)));
  const results = settled.flatMap((result) => result.result ? [result.result] : []);
  const firstError = settled.find((result) => result.error)?.error;

  if (results.length === 0 && firstError) {
    throw firstError;
  }

  return {
    results,
    model,
    usedFallback: results.length === 0,
    requestCount: settled.length
  };
}

async function scoreSingleItemWithOpenAi(
  env: Env,
  model: string,
  authorProfile: ReturnType<typeof storedProfileToPromptAuthorProfile>,
  item: CollectedItemRecord,
  timeoutMs?: number
): Promise<{ result: AiScoringResult | null; error: Error | null }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs ?? scoringConfig.openAiTimeoutMs);

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "authorization": `Bearer ${env.OPENAI_API_KEY}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "system",
            content: buildScoringPrompt(authorProfile)
          },
          {
            role: "user",
            content: JSON.stringify({
              expected_schema: {
                results: [
                  {
                    itemId: item.id,
                    aiRelevanceScore: "0-100",
                    noveltyScore: "0-100",
                    professionalValue: "0-100",
                    possibleLinkedInAngle: "short English post idea, not the article title",
                    suggestedAngle: "specific practitioner angle in English",
                    explanation: "brief explanation of why this material is useful or not",
                    keyThesis: "one specific semantic thesis extracted from this material in English",
                    keyThesisRu: "one specific semantic thesis extracted from this material in Russian",
                    postTitle: "specific future LinkedIn post title in English, grounded in this exact material",
                    postTitleRu: "specific future LinkedIn post title in Russian, grounded in this exact material",
                    shortDescription: "factual 2-4 sentence summary of what the source material says in English; do not reuse the full article title",
                    shortDescriptionRu: "factual 2-4 sentence summary of what the source material says in Russian; do not reuse the full article title",
                    audienceValue: "specific value for Product/UX audience in English",
                    audienceValueRu: "specific value for Product/UX audience in Russian",
                    hrValue: "specific value for HR/hiring signal in English",
                    hrValueRu: "specific value for HR/hiring signal in Russian",
                    recruiterValue: "what this post would signal to recruiters or hiring managers evaluating a product designer in English",
                    recruiterValueRu: "what this post would signal to recruiters or hiring managers evaluating a product designer in Russian",
                    suggestedAngleRu: "specific practitioner angle in Russian, grounded in this exact material"
                  }
                ]
              },
              author_profile: authorProfile,
              item: {
                itemId: item.id,
                title: item.title,
                canonicalUrl: item.canonical_url ?? item.url,
                summary: trimText(item.summary ?? ""),
                excerpt: trimText(item.normalized_content ?? item.raw_content ?? ""),
                sourceId: item.source_id,
                publishedAt: item.published_at,
                ruleScore: item.rule_score,
                metadata: compactMetadata(item.metadata_json)
              }
            })
          }
        ],
        text: {
          format: {
            type: "json_object"
          }
        }
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`OpenAI scoring failed: HTTP ${response.status}`);
    }

    const payload = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> };
    const text = payload.output_text ?? payload.output?.flatMap((entry) => entry.content ?? []).find((content) => content.text)?.text;

    if (!text) {
      throw new Error("OpenAI scoring response did not include text.");
    }

    const result = validateAiResults(JSON.parse(text))[0] ?? null;
    if (!result || result.itemId !== item.id) {
      throw new Error("OpenAI scoring response did not match requested item.");
    }
    rejectTitleStuffing(result, item);

    return { result, error: null };
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return { result: null, error: new Error("OpenAI scoring timed out") };
    }

    return { result: null, error: error instanceof Error ? error : new Error(String(error)) };
  } finally {
    clearTimeout(timeout);
  }
}

export function validateAiResults(value: unknown): AiScoringResult[] {
  if (!isRecord(value) || !Array.isArray(value.results)) {
    throw new Error("Invalid AI scoring JSON: results array is missing.");
  }

  return value.results.map((result) => {
    if (!isRecord(result)) {
      throw new Error("Invalid AI scoring JSON: result is not an object.");
    }

    return {
      itemId: requireString(result.itemId, "itemId"),
      aiRelevanceScore: requireScore(result.aiRelevanceScore, "aiRelevanceScore"),
      noveltyScore: requireScore(result.noveltyScore, "noveltyScore"),
      professionalValue: requireScore(result.professionalValue, "professionalValue"),
      possibleLinkedInAngle: requireString(result.possibleLinkedInAngle, "possibleLinkedInAngle"),
      suggestedAngle: optionalString(result.suggestedAngle) ?? requireString(result.possibleLinkedInAngle, "possibleLinkedInAngle"),
      explanation: requireString(result.explanation, "explanation"),
      keyThesis: requireQualityString(result.keyThesis, "keyThesis"),
      keyThesisRu: requireQualityString(result.keyThesisRu, "keyThesisRu"),
      postTitle: requireQualityString(result.postTitle, "postTitle"),
      postTitleRu: requireQualityString(result.postTitleRu, "postTitleRu"),
      shortDescription: requireQualityString(result.shortDescription, "shortDescription"),
      shortDescriptionRu: requireQualityString(result.shortDescriptionRu, "shortDescriptionRu"),
      audienceValue: requireQualityString(result.audienceValue, "audienceValue"),
      audienceValueRu: requireQualityString(result.audienceValueRu, "audienceValueRu"),
      hrValue: optionalString(result.hrValue),
      hrValueRu: optionalString(result.hrValueRu),
      recruiterValue: requireQualityString(result.recruiterValue, "recruiterValue"),
      recruiterValueRu: requireQualityString(result.recruiterValueRu, "recruiterValueRu"),
      suggestedAngleRu: requireQualityString(result.suggestedAngleRu, "suggestedAngleRu")
    };
  });
}

function trimText(value: string): string {
  return value.slice(0, scoringConfig.maxItemTextLength);
}

function compactMetadata(metadataJson: string | null): Record<string, unknown> | null {
  if (!metadataJson) {
    return null;
  }

  try {
    const parsed = JSON.parse(metadataJson) as unknown;
    if (!isRecord(parsed)) {
      return null;
    }

    return {
      ingestion_method: parsed.ingestion_method,
      extraction_status: parsed.extraction_status,
      site_name: parsed.site_name,
      source_domain: parsed.source_domain,
      quotes: Array.isArray(parsed.quotes) ? parsed.quotes.slice(0, 3) : undefined,
      links: Array.isArray(parsed.links) ? parsed.links.slice(0, 5) : undefined
    };
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Invalid AI scoring JSON: ${field} must be a string.`);
  }

  return value.trim().slice(0, 800);
}

function requireQualityString(value: unknown, field: string): string {
  const text = requireString(value, field);

  if (isGenericQualityText(text)) {
    throw new Error(`Invalid AI scoring JSON: ${field} is too generic.`);
  }

  return text.slice(0, 900);
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim().slice(0, 900) : undefined;
}

function rejectTitleStuffing(result: AiScoringResult, item: CollectedItemRecord): void {
  const title = normalizeForContentCheck(item.title);
  if (title.length < 28) {
    return;
  }

  const fields: Array<[keyof AiScoringResult, string]> = [
    ["shortDescription", result.shortDescription],
    ["shortDescriptionRu", result.shortDescriptionRu],
    ["audienceValue", result.audienceValue],
    ["audienceValueRu", result.audienceValueRu],
    ["recruiterValue", result.recruiterValue],
    ["recruiterValueRu", result.recruiterValueRu],
    ["suggestedAngle", result.suggestedAngle],
    ["suggestedAngleRu", result.suggestedAngleRu]
  ];

  for (const [field, value] of fields) {
    if (normalizeForContentCheck(value).includes(title)) {
      throw new Error(`Invalid AI scoring JSON: ${field} repeats the full article title.`);
    }
  }
}

function normalizeForContentCheck(value: string): string {
  return value
    .toLowerCase()
    .replace(/&[#a-z0-9]+;/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isGenericQualityText(value: string): boolean {
  const normalized = value.toLowerCase().replace(/\s+/g, " ").trim();
  const genericPatterns = [
    "a possible post about",
    "a possible post that",
    "a post about how",
    "a post about why",
    "a post preview grounded in",
    "post about ai ux",
    "post about ai",
    "post about ux",
    "based on the material",
    "this material can become",
    "turns the material into",
    "product decisions, user effort, and design quality",
    "clear professional position",
    "shows professional thinking",
    "возможный пост о",
    "возможный пост, который",
    "пост об ai",
    "пост о ai",
    "пост про ai",
    "пост об ux",
    "пост о ux",
    "пост про ux",
    "пост о том, как",
    "пост о том, почему",
    "на базе материала",
    "превращается не в пересказ ссылки",
    "ясную профессиональную позицию",
    "такой пост показывает",
    "показывает профессиональное мышление"
  ];

  return genericPatterns.some((pattern) => normalized.includes(pattern));
}

function requireScore(value: unknown, field: string): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`Invalid AI scoring JSON: ${field} must be a number.`);
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}
