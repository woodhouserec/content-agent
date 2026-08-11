import type { Env } from "../domain/runtime";
import type { CollectedItemRecord } from "../storage/collected-items";
import { scoringConfig } from "./config";
import { scoringPrompt } from "./prompts";

export interface AiScoringResult {
  itemId: string;
  aiRelevanceScore: number;
  noveltyScore: number;
  professionalValue: number;
  possibleLinkedInAngle: string;
  explanation: string;
  postTitle?: string;
  postTitleRu?: string;
  shortDescription?: string;
  shortDescriptionRu?: string;
  audienceValue?: string;
  audienceValueRu?: string;
  hrValue?: string;
  hrValueRu?: string;
  suggestedAngleRu?: string;
}

export interface AiScoringResponse {
  results: AiScoringResult[];
  model: string | null;
  usedFallback: boolean;
}

export async function scoreWithOpenAi(env: Env, items: CollectedItemRecord[]): Promise<AiScoringResponse> {
  if (!env.OPENAI_API_KEY || items.length === 0) {
    return {
      results: [],
      model: null,
      usedFallback: true
    };
  }

  const model = env.OPENAI_SCORING_MODEL ?? scoringConfig.defaultOpenAiModel;
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
          content: scoringPrompt
        },
        {
          role: "user",
          content: JSON.stringify({
            expected_schema: {
              results: [
                {
                  itemId: "string",
                  aiRelevanceScore: "0-100",
                  noveltyScore: "0-100",
                  professionalValue: "0-100",
                  possibleLinkedInAngle: "string",
                  explanation: "string",
                  postTitle: "specific future LinkedIn post title in English",
                  postTitleRu: "specific future LinkedIn post title in Russian",
                  shortDescription: "brief post preview in English",
                  shortDescriptionRu: "brief post preview in Russian",
                  audienceValue: "value for Product/UX audience in English",
                  audienceValueRu: "value for Product/UX audience in Russian",
                  hrValue: "value for HR/hiring signal in English",
                  hrValueRu: "value for HR/hiring signal in Russian",
                  suggestedAngleRu: "suggested angle in Russian"
                }
              ]
            },
            items: items.map((item) => ({
              itemId: item.id,
              title: item.title,
              summary: trimText(item.summary ?? item.normalized_content ?? ""),
              sourceId: item.source_id,
              publishedAt: item.published_at,
              ruleScore: item.rule_score
            }))
          })
        }
      ],
      text: {
        format: {
          type: "json_object"
        }
      }
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI scoring failed: HTTP ${response.status}`);
  }

  const payload = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> };
  const text = payload.output_text ?? payload.output?.flatMap((entry) => entry.content ?? []).find((content) => content.text)?.text;

  if (!text) {
    throw new Error("OpenAI scoring response did not include text.");
  }

  return {
    results: validateAiResults(JSON.parse(text)),
    model,
    usedFallback: false
  };
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
      explanation: requireString(result.explanation, "explanation"),
      postTitle: optionalString(result.postTitle),
      postTitleRu: optionalString(result.postTitleRu),
      shortDescription: optionalString(result.shortDescription),
      shortDescriptionRu: optionalString(result.shortDescriptionRu),
      audienceValue: optionalString(result.audienceValue),
      audienceValueRu: optionalString(result.audienceValueRu),
      hrValue: optionalString(result.hrValue),
      hrValueRu: optionalString(result.hrValueRu),
      suggestedAngleRu: optionalString(result.suggestedAngleRu)
    };
  });
}

function trimText(value: string): string {
  return value.slice(0, scoringConfig.maxItemTextLength);
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

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim().slice(0, 900) : undefined;
}

function requireScore(value: unknown, field: string): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`Invalid AI scoring JSON: ${field} must be a number.`);
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}
