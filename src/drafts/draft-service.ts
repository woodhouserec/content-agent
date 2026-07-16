import type { Env } from "../domain/runtime";
import type { DraftBriefRecord } from "../storage/draft-briefs";
import type { DraftRecord } from "../storage/drafts";
import type { createRepositories } from "../storage/repositories";
import type { TopicRecord } from "../storage/topics";
import { createRepositories as makeRepositories } from "../storage/repositories";
import { nowIso } from "../utils/time";
import { draftConfig } from "./config";
import { buildGroundedSourceContext } from "./source-context";
import {
  customRevisionPrompt,
  draftBriefPrompt,
  draftGenerationPrompt,
  expandPrompt,
  factualReviewPrompt,
  openingPrompt,
  promptVersions,
  rewritePrompt,
  shortenPrompt,
  tonePrompt
} from "./prompts";
import { OpenAiDraftClient } from "./openai-draft-client";
import type { DraftBriefData, DraftGenerationResult, DraftRevisionType, FactualReviewData, GroundedSource, OpenAiJsonResult, OpenAiUsage } from "./types";
import {
  assertRevisionLimit,
  canGenerateDraftForTopicStatus,
  validateDraftBriefResponse,
  validateDraftGenerationResponse,
  validateFactualReviewResponse
} from "./validation";

export interface DraftServiceResult {
  topic: TopicRecord;
  draft: DraftRecord;
  brief: DraftBriefRecord;
  sources: GroundedSource[];
  factualReview: FactualReviewData;
  aiCalls: number;
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

export interface AiJsonClient {
  createJson<T>(input: {
    requestType: string;
    promptVersion: string;
    systemPrompt: string;
    payload: unknown;
  }): Promise<OpenAiJsonResult<T>>;
}

export class DraftService {
  private readonly repos: ReturnType<typeof createRepositories>;
  private readonly aiClient: AiJsonClient;

  constructor(private readonly env: Env, aiClient?: AiJsonClient) {
    this.repos = makeRepositories(env.DB);
    this.aiClient = aiClient ?? new OpenAiDraftClient(env);
  }

  async generateInitialDraft(topicId: string, telegramChatId: string): Promise<DraftServiceResult> {
    const topic = await this.requireTopic(topicId);

    if (!canGenerateDraftForTopicStatus(topic.status)) {
      throw new Error("Draft can be generated only for selected topics");
    }

    const draftCount = await this.repos.drafts.countForTopic(topic.id);
    if (draftCount > 0) {
      throw new Error("Draft already exists for this topic. Use revision buttons to create a new version.");
    }

    if (draftCount >= draftConfig.maxDraftGenerationsPerTopic) {
      throw new Error(`Draft generation limit reached for this topic (${draftConfig.maxDraftGenerationsPerTopic})`);
    }

    const sources = await buildGroundedSourceContext(this.env, topic);
    const brief = await this.getOrCreateBrief(topic, sources);
    return this.createDraftFromBrief(topic, brief, sources, telegramChatId, null, null, null);
  }

  async reviseDraft(draftId: string, revisionType: DraftRevisionType, telegramChatId: string, userInstruction?: string): Promise<DraftServiceResult> {
    const parentDraft = await this.requireDraft(draftId);
    assertRevisionLimit(await this.repos.drafts.countChildren(parentDraft.id), draftConfig.maxRevisionsPerDraft);

    const topic = await this.requireTopic(parentDraft.topic_id);
    if (!canGenerateDraftForTopicStatus(topic.status)) {
      throw new Error("Draft can be revised only while the topic is selected");
    }

    const brief = await this.requireBrief(parentDraft.draft_brief_id);
    const sources = await buildGroundedSourceContext(this.env, topic);
    return this.createRevision(topic, brief, sources, parentDraft, revisionType, telegramChatId, userInstruction ?? null);
  }

  async approveDraft(draftId: string): Promise<DraftRecord> {
    const draft = await this.requireDraft(draftId);

    if (draft.status === "approved") {
      return draft;
    }

    await this.repos.drafts.updateStatus(draft.id, "approved");
    return this.requireDraft(draft.id);
  }

  async rejectDraft(draftId: string): Promise<DraftRecord> {
    const draft = await this.requireDraft(draftId);

    if (draft.status === "rejected") {
      return draft;
    }

    await this.repos.drafts.updateStatus(draft.id, "rejected");
    return this.requireDraft(draft.id);
  }

  async usageSummary(): Promise<string> {
    const monthPrefix = nowIso().slice(0, 7);
    const summary = await this.repos.aiGenerationLogs.monthlySummary(monthPrefix);
    const counts = await this.repos.drafts.countCreatedSince(`${monthPrefix}-01T00:00:00.000Z`);

    return [
      "Usage за текущий месяц:",
      "",
      `AI-вызовов: ${summary.calls}`,
      `Черновиков: ${counts.drafts}`,
      `Редакций: ${counts.revisions}`,
      `Input tokens: ${summary.inputTokens}`,
      `Output tokens: ${summary.outputTokens}`,
      `Total tokens: ${summary.totalTokens}`,
      `Ошибок: ${summary.errors}`
    ].join("\n");
  }

  private async getOrCreateBrief(topic: TopicRecord, sources: GroundedSource[]): Promise<DraftBriefRecord> {
    const existing = await this.repos.draftBriefs.getLatestForTopic(topic.id);
    if (existing) {
      return existing;
    }

    const result = await this.callAi<Record<string, unknown>>({
      requestType: "draft_brief",
      promptVersion: promptVersions.draftBrief,
      systemPrompt: draftBriefPrompt,
      payload: {
        topic: topicPayload(topic),
        sources
      }
    });
    const brief = validateDraftBriefResponse(result.data);

    return this.repos.draftBriefs.create({
      topicId: topic.id,
      centralThesis: brief.centralThesis,
      authorPosition: brief.authorPosition,
      supportingPoints: brief.supportingPoints,
      sourceFacts: brief.sourceFacts,
      practicalTakeaway: brief.practicalTakeaway,
      targetAudience: brief.targetAudience,
      desiredLength: brief.desiredLength || draftConfig.defaultPostLength,
      tone: brief.tone,
      factualConstraints: brief.factualConstraints,
      sourceItemIds: sources.map((source) => source.id),
      promptVersion: promptVersions.draftBrief,
      generationMetadata: {
        provider: "openai",
        model: result.model,
        usage: result.usage,
        latencyMs: result.latencyMs
      }
    });
  }

  private async createDraftFromBrief(
    topic: TopicRecord,
    brief: DraftBriefRecord,
    sources: GroundedSource[],
    telegramChatId: string,
    parentDraft: DraftRecord | null,
    revisionType: DraftRevisionType | null,
    userInstruction: string | null
  ): Promise<DraftServiceResult> {
    if (parentDraft) {
      return this.createRevision(topic, brief, sources, parentDraft, revisionType ?? "rewrite", telegramChatId, userInstruction);
    }

    const generated = await this.callAi<Record<string, unknown>>({
      requestType: "draft_generation",
      promptVersion: promptVersions.draftGeneration,
      systemPrompt: draftGenerationPrompt,
      payload: {
        topic: topicPayload(topic),
        brief: briefPayload(brief),
        sources
      }
    });
    const draft = validateDraftGenerationResponse(generated.data);
    const factual = await this.reviewDraft(topic, brief, sources, draft.content);

    const record = await this.repos.drafts.create({
      topicId: topic.id,
      draftBriefId: brief.id,
      telegramChatId,
      content: draft.content,
      model: generated.model,
      promptVersion: promptVersions.draftGeneration,
      generationMetadata: { provider: "openai", usage: generated.usage, latencyMs: generated.latencyMs },
      sourceSnapshot: sources,
      factualReview: factual
    });

    return {
      topic,
      draft: record,
      brief,
      sources,
      factualReview: factual,
      aiCalls: 2,
      tokenUsage: mergeUsage([generated.usage])
    };
  }

  private async createRevision(
    topic: TopicRecord,
    brief: DraftBriefRecord,
    sources: GroundedSource[],
    parentDraft: DraftRecord,
    revisionType: DraftRevisionType,
    telegramChatId: string,
    userInstruction: string | null
  ): Promise<DraftServiceResult> {
    const prompt = promptForRevision(revisionType);
    const promptVersion = promptVersionForRevision(revisionType);
    const generated = await this.callAi<Record<string, unknown>>({
      requestType: `${revisionType}_revision`,
      promptVersion,
      systemPrompt: prompt,
      payload: {
        topic: topicPayload(topic),
        brief: briefPayload(brief),
        current_draft: parentDraft.content,
        user_instruction: userInstruction,
        sources
      }
    });
    const draft = validateDraftGenerationResponse(generated.data);
    const factual = await this.reviewDraft(topic, brief, sources, draft.content);

    const record = await this.repos.drafts.create({
      topicId: topic.id,
      draftBriefId: brief.id,
      parentDraftId: parentDraft.id,
      telegramChatId,
      content: draft.content,
      model: generated.model,
      revisionType,
      userInstruction,
      promptVersion,
      generationMetadata: { provider: "openai", usage: generated.usage, latencyMs: generated.latencyMs },
      sourceSnapshot: sources,
      factualReview: factual
    });

    return {
      topic,
      draft: record,
      brief,
      sources,
      factualReview: factual,
      aiCalls: 2,
      tokenUsage: mergeUsage([generated.usage])
    };
  }

  private async reviewDraft(topic: TopicRecord, brief: DraftBriefRecord, sources: GroundedSource[], content: string): Promise<FactualReviewData> {
    const review = await this.callAi<Record<string, unknown>>({
      requestType: "factual_review",
      promptVersion: promptVersions.factualReview,
      systemPrompt: factualReviewPrompt,
      payload: {
        topic: topicPayload(topic),
        brief: briefPayload(brief),
        draft: content,
        sources
      }
    });

    return validateFactualReviewResponse(review.data);
  }

  private async callAi<T>(input: {
    requestType: string;
    promptVersion: string;
    systemPrompt: string;
    payload: unknown;
  }): Promise<OpenAiJsonResult<T>> {
    const started = Date.now();

    try {
      const result = await this.aiClient.createJson<T>(input);
      await this.repos.aiGenerationLogs.create({
        provider: "openai",
        model: result.model,
        promptVersion: input.promptVersion,
        requestType: input.requestType,
        tokenUsage: result.usage,
        latencyMs: result.latencyMs,
        status: "completed"
      });
      return result;
    } catch (error: unknown) {
      await this.repos.aiGenerationLogs.create({
        provider: "openai",
        model: this.env.OPENAI_DRAFT_MODEL ?? draftConfig.defaultOpenAiModel,
        promptVersion: input.promptVersion,
        requestType: input.requestType,
        latencyMs: Date.now() - started,
        status: "failed",
        errorType: error instanceof Error ? error.message.slice(0, 180) : "unknown"
      });
      throw error;
    }
  }

  private async requireTopic(topicId: string): Promise<TopicRecord> {
    const topic = await this.repos.topics.getById(topicId);
    if (!topic) {
      throw new Error("Topic not found");
    }

    return topic;
  }

  private async requireDraft(draftId: string): Promise<DraftRecord> {
    const draft = await this.repos.drafts.getById(draftId);
    if (!draft) {
      throw new Error("Draft not found");
    }

    return draft;
  }

  private async requireBrief(briefId: string | null): Promise<DraftBriefRecord> {
    if (!briefId) {
      throw new Error("Draft brief not found");
    }

    const brief = await this.repos.draftBriefs.getById(briefId);
    if (!brief) {
      throw new Error("Draft brief not found");
    }

    return brief;
  }
}

function topicPayload(topic: TopicRecord) {
  return {
    id: topic.id,
    title: topic.title,
    why_it_matters: topic.why_it_matters,
    suggested_angle: topic.suggested_angle,
    target_audience: topic.target_audience,
    score: topic.relevance_score
  };
}

function briefPayload(brief: DraftBriefRecord) {
  return {
    central_thesis: brief.central_thesis,
    author_position: brief.author_position,
    supporting_points: parseJsonArray(brief.supporting_points_json),
    source_facts: parseJsonArray(brief.source_facts_json),
    practical_takeaway: brief.practical_takeaway,
    target_audience: brief.target_audience,
    desired_length: brief.desired_length,
    tone: brief.tone,
    factual_constraints: parseJsonArray(brief.factual_constraints_json)
  };
}

function parseJsonArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function promptForRevision(type: DraftRevisionType): string {
  const prompts = {
    rewrite: rewritePrompt,
    shorten: shortenPrompt,
    expand: expandPrompt,
    opening: openingPrompt,
    tone: tonePrompt,
    custom: customRevisionPrompt
  };
  return prompts[type];
}

function promptVersionForRevision(type: DraftRevisionType): string {
  const versions = {
    rewrite: promptVersions.rewrite,
    shorten: promptVersions.shorten,
    expand: promptVersions.expand,
    opening: promptVersions.opening,
    tone: promptVersions.tone,
    custom: promptVersions.custom
  };
  return versions[type];
}

function mergeUsage(usages: Array<OpenAiUsage | null>): { inputTokens: number; outputTokens: number; totalTokens: number } {
  const total = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };

  for (const usage of usages) {
    if (!usage) {
      continue;
    }

    const inputTokens = numberFrom(usage.input_tokens ?? usage.prompt_tokens);
    const outputTokens = numberFrom(usage.output_tokens ?? usage.completion_tokens);
    const totalTokens = numberFrom(usage.total_tokens) || inputTokens + outputTokens;

    total.inputTokens += inputTokens;
    total.outputTokens += outputTokens;
    total.totalTokens += totalTokens;
  }

  return total;
}

function numberFrom(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
