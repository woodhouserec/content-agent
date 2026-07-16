import type { D1Database } from "../domain/runtime";
import { AiGenerationLogsRepository } from "./ai-generation-logs";
import { CollectedItemsRepository } from "./collected-items";
import { ConversationStatesRepository } from "./conversation-states";
import { DraftBriefsRepository } from "./draft-briefs";
import { DraftsRepository } from "./drafts";
import { ProcessingRunsRepository } from "./processing-runs";
import { PendingSourcesRepository } from "./pending-sources";
import { PendingManualUrlsRepository } from "./pending-manual-urls";
import { SourcesRepository } from "./sources";
import { TelegramActionsRepository } from "./telegram-actions";
import { TopicsRepository } from "./topics";

export function createRepositories(db: D1Database) {
  return {
    aiGenerationLogs: new AiGenerationLogsRepository(db),
    collectedItems: new CollectedItemsRepository(db),
    conversationStates: new ConversationStatesRepository(db),
    draftBriefs: new DraftBriefsRepository(db),
    drafts: new DraftsRepository(db),
    processingRuns: new ProcessingRunsRepository(db),
    pendingSources: new PendingSourcesRepository(db),
    pendingManualUrls: new PendingManualUrlsRepository(db),
    sources: new SourcesRepository(db),
    telegramActions: new TelegramActionsRepository(db),
    topics: new TopicsRepository(db)
  };
}
