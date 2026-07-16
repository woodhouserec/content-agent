import type { Env } from "../domain/runtime";
import { draftConfig } from "./config";
import type { OpenAiJsonResult } from "./types";

export class OpenAiDraftClient {
  constructor(private readonly env: Env) {}

  async createJson<T>(input: {
    requestType: string;
    promptVersion: string;
    systemPrompt: string;
    payload: unknown;
  }): Promise<OpenAiJsonResult<T>> {
    const apiKey = this.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const model = this.env.OPENAI_DRAFT_MODEL ?? draftConfig.defaultOpenAiModel;
    const started = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), draftConfig.openAiTimeoutMs);

    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model,
          input: [
            {
              role: "system",
              content: input.systemPrompt
            },
            {
              role: "user",
              content: JSON.stringify(input.payload)
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

      const latencyMs = Date.now() - started;
      const body = await response.json() as Record<string, unknown>;

      if (!response.ok) {
        throw new Error(`OpenAI ${input.requestType} failed: ${response.status} ${extractOpenAiError(body)}`);
      }

      const text = extractOutputText(body);
      return {
        data: JSON.parse(text) as T,
        model,
        usage: extractUsage(body),
        latencyMs
      };
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new Error(`OpenAI ${input.requestType} timed out`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

function extractOutputText(body: Record<string, unknown>): string {
  if (typeof body.output_text === "string") {
    return body.output_text;
  }

  const output = Array.isArray(body.output) ? body.output : [];
  for (const item of output) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const content = Array.isArray((item as { content?: unknown }).content) ? (item as { content: unknown[] }).content : [];
    for (const contentItem of content) {
      if (contentItem && typeof contentItem === "object") {
        const text = (contentItem as { text?: unknown }).text;
        if (typeof text === "string") {
          return text;
        }
      }
    }
  }

  throw new Error("OpenAI response did not contain JSON text");
}

function extractUsage(body: Record<string, unknown>): Record<string, number> | null {
  const usage = body.usage;
  return usage && typeof usage === "object" ? usage as Record<string, number> : null;
}

function extractOpenAiError(body: Record<string, unknown>): string {
  const error = body.error;
  if (error && typeof error === "object" && typeof (error as { message?: unknown }).message === "string") {
    return (error as { message: string }).message;
  }

  return "unknown error";
}

