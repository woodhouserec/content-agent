import type { Env } from "../domain/runtime";
import type { BackgroundJobDispatcher } from "../jobs/background-job-dispatcher";
import { logger } from "../utils/logger";
import { getConfig } from "../app/config";
import { createRepositories } from "../storage/repositories";
import { nowIso } from "../utils/time";
import { getCallbackQuery, getMessage, isAllowedTelegramUser } from "./auth";
import { handleCallback } from "./callbacks";
import { TelegramClient } from "./client";
import { buildHelpMessage, buildProfileMessage, buildStartMessage, buildStatusMessage, getCommand } from "./commands";
import type { TelegramUpdate } from "./types";
import { runScheduledCollection } from "../scheduled/handler";
import { runScoringAndSendTopics, sendLatestTopics } from "./topics";
import { handleAddSource, handleSourceDisable, handleSources, handleSourceTest } from "./source-commands";
import { extractUrl, handleAddUrl } from "./manual-url-commands";
import { buildMainMenu, buildMenuMessage, buildSectionMenu, resolveMenuAction } from "./menu";
import {
  handleAwaitingSourceUrl,
  handleSourceEditorMessage,
  promptForSourceUrl,
  setSourceMenuContext,
  showSourcesForCurrentMode,
  startSourceEditor
} from "./source-editor";
import { getSourceMenuMode } from "./source-editor";
import { handleProfileMessage, showMyProfiles, startCreateProfile } from "./profiles";
import {
  approveDraft,
  buildUsageMessage,
  formatDraftSources,
  handleCustomRevisionMessage,
  rejectDraft,
  requestCustomRevision,
  runDraftGeneration,
  runDraftRevision
} from "./drafts";

export async function handleTelegramWebhook(
  request: Request,
  env: Env,
  dispatcher: BackgroundJobDispatcher,
  requestId: string
): Promise<Response> {
  const update = (await request.json()) as TelegramUpdate;
  const config = getConfig(env);

  if (!isAllowedTelegramUser(update, config.allowedTelegramUserId)) {
    logger.warn("Telegram update rejected by owner check", {
      event: "telegram_update_rejected",
      requestId,
      updateId: update.update_id
    });

    return new Response("ok");
  }

  dispatcher.dispatch("telegram_update", async () => {
    await processTelegramUpdate(update, env, dispatcher, requestId);
  });

  return new Response("ok");
}

async function processTelegramUpdate(
  update: TelegramUpdate,
  env: Env,
  dispatcher: BackgroundJobDispatcher,
  requestId: string
): Promise<void> {
  const config = getConfig(env);
  const telegram = new TelegramClient(config.telegramBotToken);
  const message = getMessage(update);
  const callback = getCallbackQuery(update);

  if (callback) {
    await telegram.answerCallbackQuery(callback.id, "Принято");

    const chatId = callback.message?.chat.id ?? callback.from.id;
    const handledAsDraft = await handleDraftCallback(env, telegram, dispatcher, callback, String(chatId), requestId);
    if (handledAsDraft) {
      return;
    }

    const response = await handleCallback(env, callback);
    await telegram.sendMessage(String(chatId), response.text, {
      replyMarkup: response.replyMarkup
    });
    return;
  }

  if (!message) {
    logger.info("Telegram update ignored without message or callback", {
      event: "telegram_update_ignored",
      requestId,
      updateId: update.update_id
    });
    return;
  }

  const chatId = String(message.chat.id);
  const menuAction = resolveMenuAction(message.text);
  const command = menuAction?.kind === "command" ? menuAction.value : getCommand(message.text);
  const telegramUserId = String(message.from?.id ?? "");

  try {
    if (message.text && await handleSourceEditorMessage(env, telegram, chatId, telegramUserId, message.text)) {
      return;
    }

    if (message.text && await handleProfileMessage(env, telegram, chatId, telegramUserId, message.text)) {
      return;
    }

    if (message.text && await handleAwaitingSourceUrl(env, telegram, chatId, telegramUserId, message.text)) {
      return;
    }

    if (menuAction?.kind === "screen") {
      const screen = menuAction.value as "main" | "sourcesRoot" | "temporarySources" | "permanentSources" | "topics" | "profileRoot" | "myProfiles" | "drafts" | "system";
      if (screen === "temporarySources" || screen === "permanentSources") {
        await setSourceMenuContext(env, telegramUserId, chatId, screen === "temporarySources" ? "temporary" : "permanent");
      }
      if (screen === "myProfiles") {
        await showMyProfiles(env, telegram, chatId);
        return;
      }
      await telegram.sendMessage(chatId, buildMenuMessage(screen), {
        replyMarkup: screen === "main" ? buildMainMenu() : buildSectionMenu(screen)
      });
      return;
    }

    if (menuAction?.kind === "instruction") {
      if (menuAction.value === "add_url_source") {
        await promptForSourceUrl(env, telegram, chatId, telegramUserId);
        return;
      }

      if (menuAction.value === "show_sources") {
        await showSourcesForCurrentMode(env, telegram, chatId, telegramUserId);
        return;
      }

      if (menuAction.value === "edit_sources") {
        await startSourceEditor(env, telegram, chatId, telegramUserId);
        return;
      }

      if (menuAction.value === "create_profile") {
        await startCreateProfile(env, telegram, chatId, telegramUserId);
        return;
      }

      return;
    }

    if (!command && message.text) {
      const handled = await handleCustomRevisionMessage(env, telegram, chatId, telegramUserId, message.text);
      if (handled) {
        return;
      }
    }

    if (command === "/start") {
      await telegram.sendMessage(chatId, await buildStartMessage(), {
        replyMarkup: buildMainMenu()
      });
      return;
    }

    if (command === "/help") {
      await telegram.sendMessage(chatId, await buildHelpMessage(), {
        replyMarkup: buildMainMenu()
      });
      return;
    }

    if (command === "/status") {
      await telegram.sendMessage(chatId, await buildStatusMessage(env));
      return;
    }

    if (command === "/profile") {
      await telegram.sendMessage(chatId, await buildProfileMessage(env));
      return;
    }

    if (command === "/usage") {
      await telegram.sendMessage(chatId, await buildUsageMessage(env));
      return;
    }

    if (command === "/sources") {
      await handleSources(env, telegram, chatId);
      return;
    }

    if (command === "/addsource") {
      await handleAddSource(env, telegram, chatId, String(message.from?.id ?? ""), message.text);
      return;
    }

    if (command === "/addurl") {
      await handleAddUrl(env, telegram, chatId, String(message.from?.id ?? ""), message.text);
      return;
    }

    if (command === "/source_disable") {
      await handleSourceDisable(env, telegram, chatId, message.text);
      return;
    }

    if (command === "/source_test") {
      await handleSourceTest(env, telegram, chatId, message.text);
      return;
    }

    if (command === "/topics") {
      await sendLatestTopics(env, telegram, chatId, await getSourceMenuMode(env, telegramUserId));
      return;
    }

    if (command === "/score") {
      const mode = await getSourceMenuMode(env, telegramUserId);
      await telegram.sendMessage(chatId, `Создание тем запущено (${mode === "temporary" ? "временные источники" : "постоянные источники"}). Я пришлю темы, когда закончу.`);

      dispatcher.dispatch("telegram_scoring", async () => {
        try {
          await runScoringAndSendTopics(env, telegram, chatId, mode);
        } catch (error: unknown) {
          const message = formatSafeError(error);
          logger.error("Manual scoring failed", {
            event: "manual_scoring_failed",
            requestId,
            error: message
          });
          await telegram.sendMessage(chatId, `Создание тем не завершилось: ${message}`);
        }
      });

      return;
    }

    if (command === "/collect") {
      const mode = await getSourceMenuMode(env, telegramUserId);

      if (mode === "temporary") {
        await telegram.sendMessage(chatId, "Для временных источников автоматический сбор не нужен: материалы добавляются ссылками. Добавьте URL источника, затем нажмите «Создать темы».");
        return;
      }

      await telegram.sendMessage(chatId, "Сбор материалов запущен. Я напишу, когда закончу. /status можно использовать параллельно.");

      dispatcher.dispatch("telegram_manual_collection", async () => {
        try {
          await runScheduledCollection("manual", env, {
            requestedBy: "telegram",
            telegramChatId: chatId,
            requestId
          });
          await telegram.sendMessage(chatId, "Сбор материалов завершён. Используйте /status, чтобы увидеть счётчики.");
        } catch (error: unknown) {
          const message = formatSafeError(error);
          logger.error("Manual collection failed", {
            event: "manual_collection_failed",
            requestId,
            error: message
          });
          await telegram.sendMessage(chatId, `Сбор материалов не завершился: ${message}`);
        }
      });

      return;
    }

    if (!command && extractUrl(message.text ?? "")) {
      await telegram.sendMessage(chatId, "Вижу ссылку. Чтобы добавить её как разовый материал, отправьте /addurl перед ссылкой.");
      return;
    }

    await telegram.sendMessage(chatId, "Пока доступны команды /start, /help, /status, /collect, /score, /topics, /profile, /usage, /sources, /addsource, /addurl, /source_disable и /source_test.");
  } catch (error: unknown) {
    const message = formatSafeError(error);
    logger.error("Telegram command failed", {
      event: "telegram_command_failed",
      requestId,
      command,
      error: message
    });
    await telegram.sendMessage(chatId, `Команда не выполнена: ${message}`);
  }
}

async function handleDraftCallback(
  env: Env,
  telegram: TelegramClient,
  dispatcher: BackgroundJobDispatcher,
  callback: NonNullable<ReturnType<typeof getCallbackQuery>>,
  chatId: string,
  requestId: string
): Promise<boolean> {
  const data = callback.data ?? "";
  const [targetType, action, targetId] = data.split(":");

  if (!targetId || !((targetType === "topic" && action === "draft") || targetType === "draft")) {
    return false;
  }

  await logCallbackAction(env, callback, chatId, targetType, action ?? data, targetId, data);

  if (targetType === "topic" && action === "draft") {
    dispatcher.dispatch("telegram_draft_generation", async () => {
      try {
        await runDraftGeneration(env, telegram, chatId, targetId);
      } catch (error: unknown) {
        const message = formatSafeError(error);
        logger.error("Draft generation failed", { event: "draft_generation_failed", requestId, error: message });
        await telegram.sendMessage(chatId, `Черновик не создан: ${message}`);
      }
    });
    return true;
  }

  if (targetType === "draft") {
    if (action === "approve") {
      await telegram.sendMessage(chatId, await approveDraft(env, targetId));
      await telegram.sendMessage(chatId, await formatDraftSources(env, targetId));
      return true;
    }

    if (action === "reject") {
      await telegram.sendMessage(chatId, await rejectDraft(env, targetId));
      return true;
    }

    if (action === "sources") {
      await telegram.sendMessage(chatId, await formatDraftSources(env, targetId));
      return true;
    }

    if (action === "custom") {
      await telegram.sendMessage(chatId, await requestCustomRevision(env, targetId, String(callback.from.id), chatId));
      return true;
    }

    if (action === "rewrite" || action === "shorten" || action === "expand" || action === "opening" || action === "tone") {
      dispatcher.dispatch("telegram_draft_revision", async () => {
        try {
          await runDraftRevision(env, telegram, chatId, targetId, action);
        } catch (error: unknown) {
          const message = formatSafeError(error);
          logger.error("Draft revision failed", { event: "draft_revision_failed", requestId, action, error: message });
          await telegram.sendMessage(chatId, `Новая версия не создана: ${message}`);
        }
      });
      return true;
    }
  }

  return false;
}

async function logCallbackAction(
  env: Env,
  callback: NonNullable<ReturnType<typeof getCallbackQuery>>,
  chatId: string,
  targetType: string,
  action: string,
  targetId: string,
  data: string
): Promise<void> {
  const repos = createRepositories(env.DB);
  await repos.telegramActions.create({
    telegramUserId: String(callback.from.id),
    telegramChatId: chatId,
    messageId: callback.message?.message_id ? String(callback.message.message_id) : undefined,
    callbackQueryId: callback.id,
    action,
    targetType,
    targetId,
    payload: { data },
    handledAt: nowIso()
  });
}

function formatSafeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/(bot|Bearer)\s+[A-Za-z0-9:_-]+/gi, "$1 [hidden]").slice(0, 260);
}
