# Content Agent

Content Agent is a Cloudflare Worker for a Telegram-based LinkedIn content assistant.

This version contains the deployable foundation, collection, topic scoring, manual URL intake, and selected-topic draft generation.

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
- D1 repository layer;
- RSS/Atom collection;
- disabled-by-default Reddit source support;
- normalization and deduplication before D1 writes;
- rule-based relevance scoring;
- optional OpenAI scoring for a shortlist only;
- topic formation and Telegram topic review;
- source management through D1 and Telegram admin commands;
- manual one-off URL intake through Telegram;
- selected-topic LinkedIn draft generation;
- draft brief creation before writing;
- factual review before Telegram delivery;
- immutable draft versions for rewrite, shorten, expand, tone, opening, and custom revisions;
- Telegram reply-keyboard navigation with a main menu and back buttons;
- `/usage` for monthly AI usage.

It does not include:

- image generation;
- R2 storage;
- LinkedIn API;
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
| `OPENAI_API_KEY` | Required for draft generation; optional for scoring fallback |
| `OPENAI_SCORING_MODEL` | Optional model override for scoring |
| `OPENAI_DRAFT_MODEL` | Optional model override for draft generation |

Never paste these values into GitHub files.
If `OPENAI_API_KEY` is absent, `/score` still works with rule-based fallback, but draft generation stops with a clear error.

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

The second migration adds:

- dedupe fields for `collected_items`;
- source/run statistics fields for `processing_runs`;
- future visual metadata tables `visual_briefs` and `visual_assets`.

The third migration seeds initial sources:

- Nielsen Norman Group Articles;
- Smashing Magazine;
- A List Apart;
- Intercom Blog;
- Product Talk;
- Reddit r/userexperience, disabled by default;
- Reddit r/UXDesign, disabled by default.

The fourth migration adds scoring and topic fields:

- `rule_score`, `ai_score`, `final_score`;
- scoring breakdown metadata;
- topic fingerprint deduplication;
- topic explanation fields.

The fifth migration adds source-management support:

- `pending_sources`;
- richer `sources.config_json` metadata for tier, trust, content kind, language, tags, priority, licensing notes, and per-run limits.

Admin source commands:

- `/sources`
- `/addsource https://example.com/feed.xml`
- `/source_disable source_id`
- `/source_test source_id`
- `/addurl https://example.com/article`

New RSS/Atom sources should be added through D1 rows or `/addsource`.
Do not create a new Collector for every site if the existing RSS Collector can process it.
HTML scraping is not enabled.

Manual URL intake:

- accepts one-off article URLs;
- does not add domains to permanent `sources`;
- fetches static HTML only;
- does not run JavaScript;
- does not bypass paywalls, CAPTCHA, or authorization;
- saves only after Telegram confirmation;
- stores `ingestion_method = manual_url` metadata;
- participates in the same deduplication and scoring flow.

The seventh migration adds draft generation support:

- `draft_briefs`;
- draft metadata columns for prompt version, factual review, source snapshot, revision type, and generation metadata;
- `ai_generation_logs`;
- `conversation_states`.

Draft commands and buttons:

- `/start` opens the main menu panel;
- setup installs Telegram slash commands through `setMyCommands`;
- select a topic;
- press `Создать черновик`;
- review the generated text;
- approve, reject, rewrite, shorten, expand, improve opening, adjust tone, or send a custom instruction;
- use `/usage` to see monthly AI calls, drafts, revisions, token usage, and errors.

The `drafts` table already includes:

```text
parent_draft_id
```

This is used for rewrite, shorten, expand, tone, opening, and custom revision versions.

## Next Stage

The next stage should add richer text editing and prepare visual brief planning after approved or near-final drafts.

Do not add full LinkedIn post generation, image generation, R2, or LinkedIn publishing yet.
