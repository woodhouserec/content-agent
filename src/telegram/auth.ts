import type { TelegramCallbackQuery, TelegramMessage, TelegramUpdate } from "./types";

export function assertTelegramWebhookSecret(request: Request, expectedSecret: string): boolean {
  const actualSecret = request.headers.get("x-telegram-bot-api-secret-token");
  return actualSecret === expectedSecret;
}

export function getTelegramUserId(update: TelegramUpdate): string | null {
  const userId = update.message?.from?.id ?? update.callback_query?.from.id;
  return userId ? String(userId) : null;
}

export function isAllowedTelegramUser(update: TelegramUpdate, allowedUserId: string): boolean {
  return getTelegramUserId(update) === allowedUserId;
}

export function getMessage(update: TelegramUpdate): TelegramMessage | null {
  return update.message ?? null;
}

export function getCallbackQuery(update: TelegramUpdate): TelegramCallbackQuery | null {
  return update.callback_query ?? null;
}
