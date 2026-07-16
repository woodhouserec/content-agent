# Content Agent Roadmap

## Current Stage: Text Draft Generation

The current implementation collects materials, scores them, forms topics, lets the owner select a topic, and generates text draft versions for selected topics.

It does not generate images.
It does not publish to LinkedIn.

## Later Text Flow

The planned text flow is:

```text
collected_items -> topics -> drafts -> review -> approval
```

The current stage creates `topics` from scored `collected_items`.
Only a `selected` topic can produce a draft.
Draft generation is explicit through Telegram and never starts automatically when a topic is selected.

Draft generation uses:

- an author writing profile;
- a structured draft brief;
- grounded source context;
- OpenAI text generation;
- factual review before Telegram delivery;
- immutable draft versions with `parent_draft_id`;
- owner-only Telegram review actions.

The Telegram draft flow is:

```text
selected topic -> Create draft -> draft brief -> draft -> factual review -> approve/reject/revise
```

Custom revisions are stored temporarily in D1 conversation state.
KV is still not used.

## Source Management

Sources should be managed through D1, not hardcoded collectors.

RSS and Atom feeds use the universal RSS Collector.
New sites should not get custom collectors unless they require an official structured API that RSS/Atom cannot cover.

Source metadata lives in `sources.config_json`:

- `author_name`
- `source_tier`
- `content_kind`
- `language`
- `topic_tags`
- `trust_score`
- `editorial_priority`
- `max_content_age_days`
- `allow_full_text`
- `license_notes`
- `max_items_per_run`

Telegram source-management commands are intentionally admin-only through the existing owner check.
Unsupported websites without RSS, Atom, or an official API should be reported as unsupported rather than scraped.

## Manual URL Intake

Manual URL intake is separate from permanent sources.

Permanent sources are for scheduled collection.
Manual URLs are one-off article submissions from the owner.

Manual URLs should:

- be added with `/addurl`;
- be fetched with static HTTP only;
- reject localhost, loopback, link-local, private IP ranges, and metadata endpoints;
- cap redirects, timeout, and response size;
- avoid cookies, credentials, browser automation, paywall bypass, and CAPTCHA bypass;
- extract only available metadata and static text;
- save only after Telegram confirmation;
- store provenance with `ingestion_method = manual_url`;
- use the same canonical URL deduplication as RSS and Reddit items.

## Later Visual Flow

The planned visual flow is:

```text
approved or near-final draft -> visual brief -> generated assets -> review -> approval
```

Future D1 metadata tables are already reserved:

- `visual_briefs`
- `visual_assets`

Image binaries must not be stored in D1.
Future binary storage should use Cloudflare R2.
D1 should store only metadata and `storage_key`.

## Future Visual Interfaces

The codebase reserves domain interfaces for:

- `VisualBriefGenerator`
- `ImageGenerationProvider`
- `AssetStorage`
- `VisualReviewService`

No concrete image model is connected yet.
No R2 binding is configured yet.

## Future Telegram Visual Moderation

Future Telegram moderation should support:

- `Создать иллюстрацию`
- `Другой вариант`
- `Изменить концепцию`
- `Одобрить изображение`
- `Отклонить изображение`

## Visual Strategy

The intended profile style:

- editorial vector illustration;
- authorial conceptual metaphors;
- no photorealism;
- consistent palette and composition system;
- minimal text inside images;
- recognizable visual style across posts;
- future support for LinkedIn carousel assets.
