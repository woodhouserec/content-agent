import { getConfig } from "./config";
import { htmlResponse, jsonResponse, notFound } from "./response";
import type { Env, ExecutionContext } from "../domain/runtime";
import { WaitUntilBackgroundJobDispatcher } from "../jobs/background-job-dispatcher";
import { handleScheduled } from "../scheduled/handler";
import { checkD1 } from "../storage/db";
import { logger } from "../utils/logger";
import { assertTelegramWebhookSecret } from "../telegram/auth";
import { TelegramClient } from "../telegram/client";
import { handleTelegramWebhook } from "../telegram/webhook";
import { botCommands } from "../telegram/menu";
import { completeLinkedInOAuth } from "../linkedin/service";

export async function handleFetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const requestId = crypto.randomUUID();
  const url = new URL(request.url);

  logger.info("HTTP request received", {
    event: "http_request",
    requestId,
    method: request.method,
    path: url.pathname
  });

  try {
    if (request.method === "GET" && url.pathname === "/health") {
      const d1 = await checkD1(env.DB);

      return jsonResponse({
        ok: true,
        service: "content-agent",
        worker: "available",
        d1: d1.available ? "available" : "unavailable"
      });
    }

    if (request.method === "GET" && url.pathname === "/setup") {
      return htmlResponse(buildSetupPage());
    }

    if (request.method === "GET" && url.pathname === "/linkedin/oauth/callback") {
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const error = url.searchParams.get("error");

      if (error) {
        return htmlResponse(buildLinkedInPage("LinkedIn не подключён", `LinkedIn вернул ошибку: ${escapeHtml(error)}`), { status: 400 });
      }

      if (!code || !state) {
        return htmlResponse(buildLinkedInPage("LinkedIn не подключён", "Не найден code или state."), { status: 400 });
      }

      const result = await completeLinkedInOAuth(env, { code, state });
      const config = getConfig(env);
      const telegram = new TelegramClient(config.telegramBotToken);
      await telegram.sendMessage(result.telegramChatId, "LinkedIn подключён. Теперь approved drafts можно публиковать кнопкой «Опубликовать в LinkedIn».");

      return htmlResponse(buildLinkedInPage("LinkedIn подключён", "Можно вернуться в Telegram."));
    }

    if (request.method === "POST" && url.pathname === "/telegram/webhook") {
      const config = getConfig(env);

      if (!assertTelegramWebhookSecret(request, config.telegramWebhookSecret)) {
        logger.warn("Telegram webhook rejected by secret check", {
          event: "telegram_webhook_secret_rejected",
          requestId
        });

        return jsonResponse({ ok: false, error: "Unauthorized" }, { status: 401 });
      }

      const dispatcher = new WaitUntilBackgroundJobDispatcher(ctx, requestId);
      return handleTelegramWebhook(request, env, dispatcher, requestId);
    }

    if (request.method === "POST" && url.pathname === "/setup/telegram-webhook") {
      const config = getConfig(env);
      const authResponse = await assertSetupSecret(request, config.setupSecret);

      if (authResponse) {
        return authResponse;
      }

      const workerUrl = url.origin;
      const telegram = new TelegramClient(config.telegramBotToken);
      await telegram.setWebhook(`${workerUrl}/telegram/webhook`, config.telegramWebhookSecret);
      await telegram.setMyCommands(botCommands);

      logger.info("Telegram webhook configured", {
        event: "telegram_webhook_configured",
        requestId
      });

      return jsonResponse({
        ok: true,
        webhook: `${workerUrl}/telegram/webhook`,
        commands: botCommands.length
      });
    }

    if (request.method === "POST" && url.pathname === "/setup/run-scheduled") {
      const config = getConfig(env);
      const authResponse = await assertSetupSecret(request, config.setupSecret);

      if (authResponse) {
        return authResponse;
      }

      await handleScheduled(
        {
          scheduledTime: Date.now(),
          cron: "manual setup trigger"
        },
        env
      );

      return jsonResponse({
        ok: true,
        message: "Scheduled handler completed."
      });
    }

    return notFound();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);

    logger.error("HTTP request failed", {
      event: "http_request_failed",
      requestId,
      error: message
    });

    return jsonResponse({ ok: false, error: "Internal error" }, { status: 500 });
  }
}

async function assertSetupSecret(request: Request, expectedSecret: string): Promise<Response | null> {
  const actualSecret = request.headers.get("x-setup-secret") ?? (await readSetupSecretFromBody(request.clone()));

  if (actualSecret !== expectedSecret) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  return null;
}

async function readSetupSecretFromBody(request: Request): Promise<string | null> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const value = form.get("setup_secret");
    return typeof value === "string" ? value : null;
  }

  if (contentType.includes("application/json")) {
    const body = (await request.json()) as { setup_secret?: unknown };
    return typeof body.setup_secret === "string" ? body.setup_secret : null;
  }

  return null;
}

function buildSetupPage(): string {
  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Content Agent Setup</title>
    <style>
      body { font-family: system-ui, sans-serif; max-width: 720px; margin: 40px auto; padding: 0 20px; line-height: 1.5; }
      form { border: 1px solid #ddd; padding: 16px; margin: 16px 0; border-radius: 8px; }
      input, button { font: inherit; padding: 10px; }
      input { width: min(100%, 420px); display: block; margin: 8px 0 12px; }
      button { cursor: pointer; }
      code { background: #f4f4f4; padding: 2px 5px; border-radius: 4px; }
    </style>
  </head>
  <body>
    <h1>Content Agent Setup</h1>
    <p>Эта страница не показывает Telegram token. Вставьте только <code>SETUP_SECRET</code>, который вы сохранили в Cloudflare.</p>

    <form method="post" action="/setup/telegram-webhook">
      <h2>1. Установить Telegram webhook и меню команд</h2>
      <label for="webhook-secret">SETUP_SECRET</label>
      <input id="webhook-secret" name="setup_secret" type="password" autocomplete="off" required>
      <button type="submit">Установить webhook и команды</button>
    </form>

    <form method="post" action="/setup/run-scheduled">
      <h2>2. Проверить scheduled handler</h2>
      <label for="scheduled-secret">SETUP_SECRET</label>
      <input id="scheduled-secret" name="setup_secret" type="password" autocomplete="off" required>
      <button type="submit">Запустить проверку Cron</button>
    </form>
  </body>
</html>`;
}

function buildLinkedInPage(title: string, message: string): string {
  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <style>
      body { font-family: system-ui, sans-serif; max-width: 680px; margin: 56px auto; padding: 0 20px; line-height: 1.5; }
      .box { border: 1px solid #ddd; border-radius: 8px; padding: 20px; }
    </style>
  </head>
  <body>
    <div class="box">
      <h1>${escapeHtml(title)}</h1>
      <p>${message}</p>
    </div>
  </body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
