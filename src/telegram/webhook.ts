import type { Env } from "../domain/runtime";
import type { BackgroundJobDispatcher } from "../jobs/background-job-dispatcher";
import { logger } from "../utils/logger";
import { getConfig } from "../app/config";
import { getCallbackQuery, getMessage, isAllowedTelegramUser } from "./auth";
import { handleCallback } from "./callbacks";
import { TelegramClient } from "./client";
import { buildHelpMessage, buildStartMessage, buildStatusMessage, getCommand } from "./commands";
import type { TelegramUpdate } from "./types";

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
    await processTelegramUpdate(update, env, requestId);
  });

  return new Response("ok");
}

async function processTelegramUpdate(update: TelegramUpdate, env: Env, requestId: string): Promise<void> {
  const config = getConfig(env);
  const telegram = new TelegramClient(config.telegramBotToken);
  const message = getMessage(update);
  const callback = getCallbackQuery(update);

  if (callback) {
    const text = await handleCallback(env, callback);
    await telegram.answerCallbackQuery(callback.id, "Принято");

    const chatId = callback.message?.chat.id ?? callback.from.id;
    await telegram.sendMessage(String(chatId), text);
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
  const command = getCommand(message.text);

  if (command === "/start") {
    await telegram.sendMessage(chatId, await buildStartMessage());
    return;
  }

  if (command === "/help") {
    await telegram.sendMessage(chatId, await buildHelpMessage());
    return;
  }

  if (command === "/status") {
    await telegram.sendMessage(chatId, await buildStatusMessage(env));
    return;
  }

  await telegram.sendMessage(chatId, "Пока доступны команды /start, /help и /status.");
}
