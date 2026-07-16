export interface VisualBrief {
  id: string;
  topicId: string;
  draftId: string;
  concept: string;
  metaphor: string | null;
  composition: string | null;
  style: string | null;
  colorDirection: string | null;
  aspectRatio: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface VisualAsset {
  id: string;
  visualBriefId: string;
  storageKey: string;
  mimeType: string;
  width: number;
  height: number;
  generationProvider: string | null;
  generationModel: string | null;
  generationPrompt: string | null;
  version: number;
  parentAssetId: string | null;
  status: string;
  createdAt: string;
  approvedAt: string | null;
  rejectedAt: string | null;
}

export interface VisualBriefGenerator {
  createBrief(input: {
    topicId: string;
    draftId: string;
    draftContent: string;
    visualStrategy: VisualStrategy;
  }): Promise<VisualBrief>;
}

export interface ImageGenerationProvider {
  generateAsset(input: {
    visualBrief: VisualBrief;
    prompt: string;
  }): Promise<GeneratedImageAsset>;
}

export interface AssetStorage {
  put(input: {
    bytes: ArrayBuffer;
    mimeType: string;
    keyHint: string;
  }): Promise<{ storageKey: string }>;
}

export interface VisualReviewService {
  requestReview(input: {
    visualBrief: VisualBrief;
    assets: VisualAsset[];
  }): Promise<void>;
}

export interface GeneratedImageAsset {
  bytes: ArrayBuffer;
  mimeType: string;
  width: number;
  height: number;
  generationProvider: string;
  generationModel: string;
  generationPrompt: string;
}

export interface VisualStrategy {
  style: "editorial_vector_illustration";
  photorealismAllowed: false;
  textInImage: "minimal";
  supportsCarouselLater: true;
  notes: string[];
}
