import type { D1Database } from "../domain/runtime";
import { CollectedItemsRepository } from "./collected-items";
import { DraftsRepository } from "./drafts";
import { ProcessingRunsRepository } from "./processing-runs";
import { PendingSourcesRepository } from "./pending-sources";
import { SourcesRepository } from "./sources";
import { TelegramActionsRepository } from "./telegram-actions";
import { TopicsRepository } from "./topics";

export function createRepositories(db: D1Database) {
  return {
    collectedItems: new CollectedItemsRepository(db),
    drafts: new DraftsRepository(db),
    processingRuns: new ProcessingRunsRepository(db),
    pendingSources: new PendingSourcesRepository(db),
    sources: new SourcesRepository(db),
    telegramActions: new TelegramActionsRepository(db),
    topics: new TopicsRepository(db)
  };
}
