import { OpenAiDraftClient } from "../drafts/openai-draft-client";
import type { AiJsonClient } from "../drafts/draft-service";
import type { Env } from "../domain/runtime";
import { getActivePromptAuthorProfile } from "../scoring/relevance-profile";
import type { DraftRecord } from "../storage/drafts";
import type { TopicRecord } from "../storage/topics";
import type { VisualAssetRecord, VisualBriefRecord } from "../storage/visuals";
import { createRepositories } from "../storage/repositories";
import { formatPreferenceMemoryForPrompt, getActivePreferenceMemory, rememberPreference } from "../preferences/memory";
import { buildCustomImagePrompt, buildImagePrompt, visualBriefPrompt } from "./prompts";
import { visualConfig } from "./config";
import { validateVisualBriefResponse } from "./validation";
import { OpenAiImageProvider } from "./openai-image-provider";
import { R2AssetStorage } from "./r2-storage";

export interface VisualGenerationResult {
  draft: DraftRecord;
  topic: TopicRecord;
  brief: VisualBriefRecord;
  asset: VisualAssetRecord;
  imageBytes: ArrayBuffer;
  mimeType: string;
}

export class VisualService {
  private readonly repos: ReturnType<typeof createRepositories>;
  private readonly jsonClient: AiJsonClient;
  private readonly imageProvider: OpenAiImageProvider;
  private readonly storage: R2AssetStorage;

  constructor(private readonly env: Env, jsonClient?: AiJsonClient) {
    this.repos = createRepositories(env.DB);
    this.jsonClient = jsonClient ?? new OpenAiDraftClient(env);
    this.imageProvider = new OpenAiImageProvider(env);
    this.storage = new R2AssetStorage(env);
  }

  async generateForDraft(draftId: string): Promise<VisualGenerationResult> {
    const draft = await this.requireApprovedDraft(draftId);
    const topic = await this.requireTopic(draft.topic_id);
    const preferenceMemory = await this.preferenceMemoryForPrompt();
    const brief = await this.getOrCreateBrief(topic, draft);
    const existingAssets = await this.repos.visuals.countGeneratedActiveAssetsForTopic(topic.id);

    if (existingAssets >= visualConfig.maxImageVariantsPerDraft) {
      throw new Error(`Image variant limit reached for this topic (${visualConfig.maxImageVariantsPerDraft})`);
    }

    const prompt = buildImagePrompt({
      concept: brief.concept,
      metaphor: brief.metaphor,
      composition: brief.composition,
      style: brief.style,
      colorDirection: brief.color_direction,
      aspectRatio: brief.aspect_ratio,
      preferenceMemory
    });
    const generated = await this.imageProvider.generate(prompt);
    const stored = await this.storage.put({
      bytes: generated.bytes,
      mimeType: generated.mimeType,
      keyHint: `${draft.id}-v${existingAssets + 1}`
    });
    const asset = await this.repos.visuals.createAsset({
      visualBriefId: brief.id,
      storageKey: stored.storageKey,
      mimeType: generated.mimeType,
      width: generated.width,
      height: generated.height,
      generationProvider: generated.generationProvider,
      generationModel: generated.generationModel,
      generationPrompt: generated.generationPrompt
    });

    return {
      draft,
      topic,
      brief,
      asset,
      imageBytes: generated.bytes,
      mimeType: generated.mimeType
    };
  }

  async generateCustomVariant(assetId: string, instruction: string): Promise<VisualGenerationResult> {
    const asset = await this.repos.visuals.getAssetById(assetId);
    if (!asset) {
      throw new Error("Visual asset not found");
    }

    const brief = await this.repos.visuals.getBriefById(asset.visual_brief_id);
    if (!brief) {
      throw new Error("Visual brief not found");
    }

    const topic = await this.requireTopic(brief.topic_id);
    const draft = await this.requireApprovedDraft(brief.draft_id);
    const existingAssets = await this.repos.visuals.countGeneratedActiveAssetsForTopic(topic.id);
    if (existingAssets >= visualConfig.maxImageVariantsPerDraft) {
      throw new Error(`Image variant limit reached for this topic (${visualConfig.maxImageVariantsPerDraft})`);
    }

    const prompt = buildCustomImagePrompt({
      concept: brief.concept,
      metaphor: brief.metaphor,
      composition: brief.composition,
      style: brief.style,
      colorDirection: brief.color_direction,
      aspectRatio: brief.aspect_ratio,
      userInstruction: instruction,
      preferenceMemory: await this.preferenceMemoryForPrompt()
    });
    const generated = await this.imageProvider.generate(prompt);
    const stored = await this.storage.put({
      bytes: generated.bytes,
      mimeType: generated.mimeType,
      keyHint: `${draft.id}-custom-v${existingAssets + 1}`
    });
    const nextAsset = await this.repos.visuals.createAsset({
      visualBriefId: brief.id,
      storageKey: stored.storageKey,
      mimeType: generated.mimeType,
      width: generated.width,
      height: generated.height,
      generationProvider: generated.generationProvider,
      generationModel: generated.generationModel,
      generationPrompt: generated.generationPrompt,
      parentAssetId: asset.id
    });

    return {
      draft,
      topic,
      brief,
      asset: nextAsset,
      imageBytes: generated.bytes,
      mimeType: generated.mimeType
    };
  }

  async approveAsset(assetId: string): Promise<VisualAssetRecord> {
    await this.repos.visuals.updateAssetStatus(assetId, "approved");
    const asset = await this.repos.visuals.getAssetById(assetId);
    if (!asset) {
      throw new Error("Visual asset not found");
    }
    await this.rememberVisualDecision(asset, "visual_approved");
    return asset;
  }

  async addUploadedAssetForDraft(input: {
    draftId: string;
    bytes: ArrayBuffer;
    mimeType: string;
    width: number;
    height: number;
    fileName?: string | null;
    uploadedBy: string;
  }): Promise<VisualGenerationResult> {
    const draft = await this.requireApprovedDraft(input.draftId);
    const topic = await this.requireTopic(draft.topic_id);
    const brief = await this.getOrCreateBrief(topic, draft);
    const stored = await this.storage.put({
      bytes: input.bytes,
      mimeType: input.mimeType,
      keyHint: `${draft.id}-upload`
    });
    const asset = await this.repos.visuals.createAsset({
      visualBriefId: brief.id,
      storageKey: stored.storageKey,
      mimeType: input.mimeType,
      width: input.width,
      height: input.height,
      generationProvider: "user_upload",
      generationModel: "telegram_upload",
      generationPrompt: JSON.stringify({
        uploaded_by: input.uploadedBy,
        file_name: input.fileName ?? null
      }),
      status: "uploaded"
    });

    return {
      draft,
      topic,
      brief,
      asset,
      imageBytes: input.bytes,
      mimeType: input.mimeType
    };
  }

  async resetVariantLimitForDraft(draftId: string): Promise<number> {
    const draft = await this.requireApprovedDraft(draftId);
    return this.repos.visuals.archiveNonApprovedAssetsForTopic(draft.topic_id);
  }

  async rejectAsset(assetId: string): Promise<VisualAssetRecord> {
    await this.repos.visuals.updateAssetStatus(assetId, "rejected");
    const asset = await this.repos.visuals.getAssetById(assetId);
    if (!asset) {
      throw new Error("Visual asset not found");
    }
    await this.rememberVisualDecision(asset, "visual_rejected");
    return asset;
  }

  private async getOrCreateBrief(topic: TopicRecord, draft: DraftRecord): Promise<VisualBriefRecord> {
    const existing = await this.repos.visuals.getLatestBriefForDraft(draft.id) ?? await this.repos.visuals.getLatestBriefForTopic(topic.id);
    if (existing) {
      return existing;
    }

    const result = await this.jsonClient.createJson<Record<string, unknown>>({
      requestType: "visual_brief",
      promptVersion: visualConfig.promptVersion,
      systemPrompt: visualBriefPrompt,
      payload: {
        topic: {
          title: topic.title,
          title_ru: topic.title_ru,
          suggested_angle: topic.suggested_angle,
          suggested_angle_ru: topic.suggested_angle_ru
        },
        draft: {
          content: draft.content
        },
        strategy: {
          style: "editorial_vector_illustration",
          photorealism_allowed: false,
          text_in_image: "minimal"
        },
        author_profile: await getActivePromptAuthorProfile(this.env),
        preference_memory: await this.preferenceMemoryForPrompt()
      }
    });
    const brief = validateVisualBriefResponse(result.data);

    return this.repos.visuals.createBrief({
      topicId: topic.id,
      draftId: draft.id,
      concept: brief.concept,
      metaphor: brief.metaphor,
      composition: brief.composition,
      style: brief.style,
      colorDirection: brief.colorDirection,
      aspectRatio: brief.aspectRatio || visualConfig.defaultAspectRatio
    });
  }

  private async requireApprovedDraft(draftId: string): Promise<DraftRecord> {
    const draft = await this.repos.drafts.getById(draftId);
    if (!draft) {
      throw new Error("Draft not found");
    }

    if (draft.status !== "approved") {
      throw new Error("Only approved drafts can get generated images");
    }

    return draft;
  }

  private async requireTopic(topicId: string): Promise<TopicRecord> {
    const topic = await this.repos.topics.getById(topicId);
    if (!topic) {
      throw new Error("Topic not found");
    }

    return topic;
  }

  private async preferenceMemoryForPrompt(): Promise<string> {
    return formatPreferenceMemoryForPrompt(await getActivePreferenceMemory(this.env));
  }

  private async rememberVisualDecision(asset: VisualAssetRecord, eventType: "visual_approved" | "visual_rejected"): Promise<void> {
    const brief = await this.repos.visuals.getBriefById(asset.visual_brief_id);
    if (!brief) {
      return;
    }

    try {
      await rememberPreference(this.env, {
        eventType,
        targetType: "visual_asset",
        targetId: asset.id,
        section: eventType === "visual_approved" ? "visual_preferences" : "avoid",
        signal: eventType === "visual_approved"
          ? `Approved visual direction: ${brief.concept}${brief.metaphor ? `; metaphor: ${brief.metaphor}` : ""}`
          : `Avoid visual direction: ${brief.concept}${brief.metaphor ? `; metaphor: ${brief.metaphor}` : ""}`,
        metadata: {
          version: asset.version,
          style: brief.style,
          colorDirection: brief.color_direction,
          aspectRatio: brief.aspect_ratio
        }
      });
    } catch {
      // Preference memory should never block visual review.
    }
  }
}
