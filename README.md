# Content Agent

Content Agent is a Cloudflare Worker for a Telegram-based LinkedIn content assistant.

This version is only the first deployable foundation.

It includes:

- Cloudflare Worker;
- Cloudflare D1 database;
- `/health` endpoint;
- Telegram webhook endpoint;
- owner-only Telegram access;
- `/start`, `/help`, `/status` commands;
- Cron handler foundation;
- manual setup page at `/setup`;
- manual scheduled-handler test;
- D1 repository layer.

It does not include:

- RSS collection;
- Reddit collection;
- Content Pipeline;
- OpenAI draft generation;
- LinkedIn publishing.

## What You Will Deploy

You will deploy this project through:

1. GitHub repository.
2. Cloudflare Dashboard.
3. Cloudflare Workers GitHub integration.
4. Cloudflare D1 Console.
5. Telegram BotFather.

You do not need to put Telegram tokens into a browser URL.

## Values You Must Prepare

You will need these four private values:

| Name | Where You Get It |
| --- | --- |
| `TELEGRAM_BOT_TOKEN` | Telegram BotFather |
| `TELEGRAM_WEBHOOK_SECRET` | You create this random text yourself |
| `ALLOWED_TELEGRAM_USER_ID` | Telegram user ID bot |
| `SETUP_SECRET` | You create this random text yourself |

Never paste these values into GitHub files.

## Important Cloudflare Settings

Cloudflare must use these settings when it builds the Worker from GitHub:

| Setting | Value |
| --- | --- |
| Build command | `npm install && npm run typecheck` |
| Deploy command | leave empty if Cloudflare asks, or use the default Worker deploy flow |
| Worker entrypoint | `src/index.ts` |
| D1 binding name | `DB` |

The D1 binding must be named exactly:

```text
DB
```

## Safe Setup Page

After the Worker is deployed, open:

```text
WORKER_URL/setup
```

This page lets you:

1. Install the Telegram webhook.
2. Run the scheduled handler manually.

The page asks for `SETUP_SECRET`.

The Telegram bot token is never shown on the page.
The Telegram bot token is never placed in the browser URL.

## Health Check

After deploy, open:

```text
WORKER_URL/health
```

Expected result:

```json
{
  "ok": true,
  "service": "content-agent",
  "worker": "available",
  "d1": "available"
}
```

## Telegram Check

After webhook setup, open your Telegram bot and send:

```text
/start
```

Expected result:

```text
Content Agent запущен.
```

Then send:

```text
/status
```

Expected result:

```text
Worker: доступен
D1: доступна
```

Only the Telegram user from `ALLOWED_TELEGRAM_USER_ID` can use the bot.

## Database Tables

The first migration creates:

- `sources`;
- `collected_items`;
- `topics`;
- `drafts`;
- `telegram_actions`;
- `processing_runs`.

The `drafts` table already includes:

```text
parent_draft_id
```

This will be used later for rewrite and shorten versions.

## Next Stage

The next stage should add only:

- RSS Collector;
- Reddit Collector;
- collection records in D1.

Do not add OpenAI, Content Pipeline, or LinkedIn publishing yet.
