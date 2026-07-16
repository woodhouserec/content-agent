import type { D1Database } from "../domain/runtime";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";

export interface CreateAiGenerationLogInput {
  provider: string;
  model: string;
  promptVersion: string;
  requestType: string;
  tokenUsage?: unknown;
  latencyMs: number;
  status: "completed" | "failed";
  errorType?: string | null;
}

export interface AiUsageSummary {
  calls: number;
  draftCount: number;
  revisionCount: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  errors: number;
}

export class AiGenerationLogsRepository {
  constructor(private readonly db: D1Database) {}

  async create(input: CreateAiGenerationLogInput): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO ai_generation_logs (
          id, provider, model, prompt_version, request_type, token_usage_json,
          latency_ms, status, error_type, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        createId("ailog"),
        input.provider,
        input.model,
        input.promptVersion,
        input.requestType,
        input.tokenUsage ? JSON.stringify(input.tokenUsage) : null,
        input.latencyMs,
        input.status,
        input.errorType ?? null,
        nowIso()
      )
      .run();
  }

  async monthlySummary(monthPrefix: string): Promise<AiUsageSummary> {
    const result = await this.db
      .prepare(
        `SELECT request_type, token_usage_json, status
         FROM ai_generation_logs
         WHERE created_at >= ? AND created_at < ?`
      )
      .bind(`${monthPrefix}-01T00:00:00.000Z`, nextMonthPrefix(monthPrefix))
      .all<{ request_type: string; token_usage_json: string | null; status: string }>();

    const rows = result.results ?? [];
    let inputTokens = 0;
    let outputTokens = 0;
    let totalTokens = 0;

    for (const row of rows) {
      const usage = parseUsage(row.token_usage_json);
      inputTokens += usage.inputTokens;
      outputTokens += usage.outputTokens;
      totalTokens += usage.totalTokens;
    }

    return {
      calls: rows.length,
      draftCount: rows.filter((row) => row.request_type === "draft_generation").length,
      revisionCount: rows.filter((row) => row.request_type.endsWith("_revision")).length,
      inputTokens,
      outputTokens,
      totalTokens,
      errors: rows.filter((row) => row.status === "failed").length
    };
  }
}

function parseUsage(value: string | null): { inputTokens: number; outputTokens: number; totalTokens: number } {
  if (!value) {
    return { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
  }

  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    const inputTokens = numberFrom(parsed.input_tokens ?? parsed.prompt_tokens);
    const outputTokens = numberFrom(parsed.output_tokens ?? parsed.completion_tokens);
    const totalTokens = numberFrom(parsed.total_tokens) || inputTokens + outputTokens;
    return { inputTokens, outputTokens, totalTokens };
  } catch {
    return { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
  }
}

function numberFrom(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function nextMonthPrefix(monthPrefix: string): string {
  const [yearRaw, monthRaw] = monthPrefix.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const next = new Date(Date.UTC(year, month, 1));
  return next.toISOString().slice(0, 7) + "-01T00:00:00.000Z";
}
