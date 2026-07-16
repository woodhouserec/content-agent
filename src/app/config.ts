import type { Env } from "../domain/runtime";

export interface AppConfig {
  telegramBotToken: string;
  telegramWebhookSecret: string;
  allowedTelegramUserId: string;
  setupSecret: string;
}

export function getConfig(env: Env): AppConfig {
  return {
    telegramBotToken: requireValue(env.TELEGRAM_BOT_TOKEN, "TELEGRAM_BOT_TOKEN"),
    telegramWebhookSecret: requireValue(env.TELEGRAM_WEBHOOK_SECRET, "TELEGRAM_WEBHOOK_SECRET"),
    allowedTelegramUserId: requireValue(env.ALLOWED_TELEGRAM_USER_ID, "ALLOWED_TELEGRAM_USER_ID"),
    setupSecret: requireValue(env.SETUP_SECRET, "SETUP_SECRET")
  };
}

function requireValue(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}
