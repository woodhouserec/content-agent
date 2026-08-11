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
import { resetTopicsForMode, runScoringAndSendTopics, sendLatestTopics } from "./topics";
import { handleAddSource, handleSourceDisable, handleSources, handleSourceTest } from "./source-commands";
import { createDraftTopicFromManualUrl, extractUrl, handleAddUrl } from "./manual-url-commands";
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
  buildApprovedDraftKeyboard,
  buildUsageMessage,
  buildLinkedInConnectMessage,
  consumeCustomRevisionInstruction,
  formatDraftSources,
  rejectDraft,
  requestCustomRevision,
  runDraftGeneration,
  runDraftRevision,
  sendApprovedDraftMessages
} from "./drafts";
import { publishDraftToLinkedIn } from "../linkedin/service";
import {
  approveVisualAsset,
  consumeCustomVisualInstruction,
  handleAwaitingVisualUpload,
  rejectVisualAsset,
  requestVisualUpload,
  requestCustomVisualRevision,
  resetVisualLimitForDraft,
  runCustomVisualRevision,
  runVisualGeneration,
  sendAdjacentVisualAsset,
  sendVisualLibraryForDraft
} from "./visuals";

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
    const chatId = callback.message?.chat.id ?? callback.from.id;
    try {
      await telegram.answerCallbackQuery(callback.id, "Принято");

      const handledAsDraft = await handleDraftCallback(env, telegram, dispatcher, callback, String(chatId), requestId);
      if (handledAsDraft) {
        return;
      }

      const response = await handleCallback(env, callback);
      await telegram.sendMessage(String(chatId), response.text, {
        replyMarkup: response.replyMarkup
      });
    } catch (error: unknown) {
      const message = formatSafeError(error);
      logger.error("Telegram callback failed", {
        event: "telegram_callback_failed",
        requestId,
        callbackData: callback.data,
        error: message
      });
      await telegram.sendMessage(String(chatId), `Действие не выполнено: ${message}`);
    }
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

    if (await handleAwaitingVisualUpload(env, telegram, chatId, telegramUserId, message)) {
      return;
    }

    if (message.text && await handleProfileMessage(env, telegram, chatId, telegramUserId, message.text)) {
      return;
    }

    if (message.text && await handleAwaitingSourceUrl(env, telegram, chatId, telegramUserId, message.text)) {
      return;
    }

    const customRevision = message.text ? await consumeCustomRevisionInstruction(env, telegramUserId, message.text) : null;
    if (customRevision) {
      try {
        await runDraftRevision(env, telegram, chatId, customRevision.draftId, "custom", customRevision.text);
      } catch (error: unknown) {
        const message = formatSafeError(error);
        logger.error("Custom draft revision failed", { event: "custom_draft_revision_failed", requestId, error: message });
        await telegram.sendMessage(chatId, `Новая версия не создана: ${message}`);
      }
      return;
    }

    const customVisual = message.text ? await consumeCustomVisualInstruction(env, telegramUserId, message.text) : null;
    if (customVisual) {
      dispatcher.dispatch("telegram_custom_visual_revision", async () => {
        try {
          await runCustomVisualRevision(env, telegram, chatId, telegramUserId, customVisual.assetId, customVisual.text);
        } catch (error: unknown) {
          const message = formatSafeError(error);
          logger.error("Custom visual revision failed", { event: "custom_visual_revision_failed", requestId, error: message });
          await telegram.sendMessage(chatId, `Новый вариант изображения не создан: ${message}`);
        }
      });
      return;
    }

    if (menuAction?.kind === "screen") {
      const screen = menuAction.value as "main" | "sourcesRoot" | "temporarySources" | "permanentSources" | "profileRoot" | "myProfiles" | "system";
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

      if (menuAction.value === "reset_topics") {
        const mode = await getSourceMenuMode(env, telegramUserId);
        const resetCount = await resetTopicsForMode(env, mode);
        await telegram.sendMessage(
          chatId,
          resetCount > 0
            ? `Темы сброшены (${mode === "temporary" ? "временные источники" : "постоянные источники"}): ${resetCount}. Теперь нажмите «Показать темы».`
            : `Нет тем для сброса (${mode === "temporary" ? "временные источники" : "постоянные источники"}).`
        );
        return;
      }

      if (menuAction.value === "connect_linkedin") {
        try {
          await telegram.sendMessage(chatId, await buildLinkedInConnectMessage(env, telegramUserId, chatId));
        } catch (error: unknown) {
          const message = formatSafeError(error);
          logger.error("LinkedIn connect link failed", { event: "linkedin_connect_link_failed", requestId, error: message });
          await telegram.sendMessage(chatId, `LinkedIn пока не подключается: ${message}`);
        }
        return;
      }

      return;
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
          const { stats } = await runScheduledCollection("manual", env, {
            requestedBy: "telegram",
            telegramChatId: chatId,
            requestId
          });
          await telegram.sendMessage(chatId, [
            "Сбор материалов завершён.",
            `Источников обработано: ${stats.processedSources}`,
            `Успешных источников: ${stats.successfulSources}`,
            `Ошибок источников: ${stats.failedSources}`,
            `Новых материалов: ${stats.newItems}`,
            `Дублей: ${stats.duplicateItems}`,
            "",
            "Теперь можно нажать «Создать темы»."
          ].join("\n"));
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

  if (!targetId || !((targetType === "topic" && action === "draft") || (targetType === "manualurl" && action === "draft") || targetType === "draft" || targetType === "visual")) {
    return false;
  }

  await logCallbackAction(env, callback, chatId, targetType, action ?? data, targetId, data);

  if (targetType === "manualurl" && action === "draft") {
    await telegram.sendMessage(chatId, "Материал принят. Подготовлю его для черновика и покажу кнопку «Создать черновик».");
    try {
      const response = await createDraftTopicFromManualUrl(env, targetId);
      await telegram.sendMessage(chatId, response.text, {
        replyMarkup: response.replyMarkup
      });
    } catch (error: unknown) {
      const message = formatSafeError(error);
      logger.error("Manual URL direct topic failed", { event: "manual_url_direct_topic_failed", requestId, error: message });
      await telegram.sendMessage(chatId, `Пост по материалу не создан: ${message}`);
    }
    return true;
  }

  if (targetType === "topic" && action === "draft") {
    try {
      await runDraftGeneration(env, telegram, chatId, targetId);
    } catch (error: unknown) {
      const message = formatSafeError(error);
      logger.error("Draft generation failed", { event: "draft_generation_failed", requestId, error: message });
      await telegram.sendMessage(chatId, `Черновик не создан: ${message}`);
    }
    return true;
  }

  if (targetType === "draft") {
    if (action === "approve") {
      try {
        await sendApprovedDraftMessages(env, telegram, chatId, targetId, String(callback.from.id));
      } catch (error: unknown) {
        const message = formatSafeError(error);
        logger.error("Draft approval failed", { event: "draft_approval_failed", requestId, error: message });
        await telegram.sendMessage(chatId, `Одобрение не выполнено: ${message}`);
      }
      return true;
    }

    if (action === "linkedin") {
      try {
        await telegram.sendMessage(chatId, await buildLinkedInConnectMessage(env, String(callback.from.id), chatId));
      } catch (error: unknown) {
        const message = formatSafeError(error);
        logger.error("LinkedIn connect link failed", { event: "linkedin_connect_link_failed", requestId, error: message });
        await telegram.sendMessage(chatId, `LinkedIn пока не подключается: ${message}`);
      }
      return true;
    }

    if (action === "publish" || action === "publish_force") {
      dispatcher.dispatch("telegram_linkedin_publish", async () => {
        try {
          await telegram.sendMessage(chatId, "Публикация в LinkedIn запущена.");
          const result = await publishDraftToLinkedIn(env, {
            draftId: targetId,
            telegramUserId: String(callback.from.id),
            force: action === "publish_force"
          });
          if (result.alreadyPublished) {
            await telegram.sendMessage(chatId, `Этот черновик уже был опубликован в LinkedIn: ${result.postUrn}`, {
              replyMarkup: buildForcePublishKeyboard(targetId)
            });
          } else {
            await telegram.sendMessage(chatId, `Пост опубликован в LinkedIn: ${result.postUrn}`);
          }
        } catch (error: unknown) {
          const message = formatSafeError(error);
          logger.error("LinkedIn publish failed", { event: "linkedin_publish_failed", requestId, error: message });
          await telegram.sendMessage(chatId, `Публикация в LinkedIn не выполнена: ${message}`);
        }
      });
      return true;
    }

    if (action === "publish_cancel") {
      await telegram.sendMessage(chatId, "Повторная публикация отменена.");
      return true;
    }

    if (action === "visual") {
      dispatcher.dispatch("telegram_visual_generation", async () => {
        try {
          await runVisualGeneration(env, telegram, chatId, String(callback.from.id), targetId);
        } catch (error: unknown) {
          const message = formatSafeError(error);
          logger.error("Visual generation failed", { event: "visual_generation_failed", requestId, error: message });
          await telegram.sendMessage(chatId, `Иллюстрация не создана: ${message}`, {
            replyMarkup: isVisualLimitError(message) ? buildVisualLimitResetKeyboard(targetId) : undefined
          });
        }
      });
      return true;
    }

    if (action === "visual_select") {
      await sendVisualLibraryForDraft(env, telegram, chatId, String(callback.from.id), targetId);
      return true;
    }

    if (action === "visual_upload") {
      await telegram.sendMessage(chatId, await requestVisualUpload(env, String(callback.from.id), chatId, targetId));
      return true;
    }

    if (action === "visual_reset") {
      await telegram.sendMessage(chatId, await resetVisualLimitForDraft(env, targetId), {
        replyMarkup: {
          inline_keyboard: [[{ text: "Создать иллюстрацию", callback_data: `draft:visual:${targetId}` }]]
        }
      });
      return true;
    }

    if (action === "visual_reset_cancel") {
      await telegram.sendMessage(chatId, "Сброс лимита отменён.");
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
      try {
        await runDraftRevision(env, telegram, chatId, targetId, action);
      } catch (error: unknown) {
        const message = formatSafeError(error);
        logger.error("Draft revision failed", { event: "draft_revision_failed", requestId, action, error: message });
        await telegram.sendMessage(chatId, `Новая версия не создана: ${message}`);
      }
      return true;
    }
  }

  if (targetType === "visual") {
    if (action === "prev" || action === "next") {
      await sendAdjacentVisualAsset(env, telegram, chatId, String(callback.from.id), targetId, action);
      return true;
    }

    if (action === "noop") {
      await telegram.sendMessage(chatId, "Это номер текущей версии изображения.");
      return true;
    }

    if (action === "custom") {
      await telegram.sendMessage(chatId, await requestCustomVisualRevision(env, String(callback.from.id), chatId, targetId));
      return true;
    }

    if (action === "approve") {
      const result = await approveVisualAsset(env, String(callback.from.id), targetId);
      await telegram.sendMessage(chatId, result.message, {
        replyMarkup: await buildApprovedDraftKeyboard(env, result.draftId, String(callback.from.id), chatId)
      });
      return true;
    }

    if (action === "reject") {
      await telegram.sendMessage(chatId, await rejectVisualAsset(env, targetId));
      return true;
    }
  }

  return false;
}

function buildForcePublishKeyboard(draftId: string) {
  return {
    inline_keyboard: [
      [{ text: "Все равно опубликовать", callback_data: `draft:publish_force:${draftId}` }],
      [{ text: "Отмена", callback_data: `draft:publish_cancel:${draftId}` }]
    ]
  };
}

function buildVisualLimitResetKeyboard(draftId: string) {
  return {
    inline_keyboard: [
      [{ text: "Да, сбросить", callback_data: `draft:visual_reset:${draftId}` }],
      [{ text: "Назад", callback_data: `draft:visual_reset_cancel:${draftId}` }]
    ]
  };
}

function isVisualLimitError(message: string): boolean {
  return message.includes("Image variant limit reached");
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
  return message
    .replace(/(bot|Bearer)\s+[A-Za-z0-9:_-]+/gi, "$1 [hidden]")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .slice(0, 260);
}
