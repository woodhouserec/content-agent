import type { DraftBriefData, DraftGenerationResult, FactualReviewData } from "./types";

export function validateDraftBriefResponse(value: unknown): DraftBriefData {
  const record = expectRecord(value, "draft brief");

  return {
    centralThesis: expectText(record.central_thesis, "central_thesis"),
    authorPosition: expectText(record.author_position, "author_position"),
    supportingPoints: expectTextArray(record.supporting_points, "supporting_points"),
    sourceFacts: expectTextArray(record.source_facts, "source_facts"),
    practicalTakeaway: expectText(record.practical_takeaway, "practical_takeaway"),
    targetAudience: expectText(record.target_audience, "target_audience"),
    desiredLength: expectText(record.desired_length, "desired_length"),
    tone: expectText(record.tone, "tone"),
    factualConstraints: expectTextArray(record.factual_constraints, "factual_constraints")
  };
}

export function validateDraftGenerationResponse(value: unknown): DraftGenerationResult {
  const record = expectRecord(value, "draft generation");
  return {
    content: expectText(record.content, "content", 120)
  };
}

export function validateFactualReviewResponse(value: unknown): FactualReviewData {
  const record = expectRecord(value, "factual review");
  const flags = expectTextArray(record.flags, "flags", true);

  return {
    hasSeriousConflict: typeof record.has_serious_conflict === "boolean" ? record.has_serious_conflict : flags.length > 0,
    flags,
    summary: expectText(record.summary, "summary")
  };
}

export function canGenerateDraftForTopicStatus(status: string): boolean {
  return status === "selected";
}

export function assertRevisionLimit(currentChildren: number, limit: number): void {
  if (currentChildren >= limit) {
    throw new Error(`Revision limit reached for this draft (${limit})`);
  }
}

function expectRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Invalid ${label} JSON response`);
  }

  return value as Record<string, unknown>;
}

function expectText(value: unknown, field: string, minLength = 1): string {
  if (typeof value !== "string" || value.trim().length < minLength) {
    throw new Error(`Invalid ${field} in model response`);
  }

  return value.trim();
}

function expectTextArray(value: unknown, field: string, allowEmpty = false): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid ${field} in model response`);
  }

  const items = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim());
  if (!allowEmpty && items.length === 0) {
    throw new Error(`Invalid ${field} in model response`);
  }

  return items;
}

